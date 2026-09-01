/**
 * @file Class/根节点更新队列
 * @description 挂载在 fiber.updateQueue 上的单向循环链表，保存组件/根节点收到的 update
 */

import { NoLanes, mergeLanes, type Lane, type Lanes } from "./ReactFiberLane";
import type { FiberNode } from "./ReactFiber";

// 对照官方 packages/react-reconciler/src/ReactFiberClassUpdateQueue.new.js：Update 对象是
// 不可变的纯数据（payload 携带新 state/新 element），shared.pending 是循环链表（last 指向
// 最新一条，last.next 指向最旧一条），处理时解环拼到 base 队列上。回调 effect 与 forceUpdate
// 等 class 组件特性留到 Phase 8，这里先保留结构、省略 effect 收集。

export const UpdateState = 0;
export const ReplaceState = 1;
export const ForceUpdate = 2;
export const CaptureUpdate = 3;

export type UpdateTag = 0 | 1 | 2 | 3;

export interface Update<State> {
  eventTime: number;
  lane: Lane;

  tag: UpdateTag;
  payload: any;
  callback: (() => void) | null;

  next: Update<State> | null;
}

export interface SharedQueue<State> {
  pending: Update<State> | null;
  lanes: Lanes;
}

export interface UpdateQueue<State> {
  baseState: State;
  firstBaseUpdate: Update<State> | null;
  lastBaseUpdate: Update<State> | null;
  shared: SharedQueue<State>;
  effects: Update<State>[] | null;
}

/**
 * 在 fiber 上初始化一个空的更新队列
 * @param fiber - 目标 fiber
 */
export function initializeUpdateQueue<State>(fiber: FiberNode): void {
  const queue: UpdateQueue<State> = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null,
      lanes: NoLanes,
    },
    effects: null,
  };
  fiber.updateQueue = queue;
}

/**
 * 把 current 上的更新队列克隆到 workInProgress 上（除非它已经是克隆）
 * @param current - current fiber
 * @param workInProgress - workInProgress fiber
 */
export function cloneUpdateQueue<State>(
  current: FiberNode,
  workInProgress: FiberNode,
): void {
  const queue: UpdateQueue<State> = workInProgress.updateQueue;
  const currentQueue: UpdateQueue<State> = current.updateQueue;
  if (queue === currentQueue) {
    const clone: UpdateQueue<State> = {
      baseState: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared,
      effects: currentQueue.effects,
    };
    workInProgress.updateQueue = clone;
  }
}

/**
 * 创建一个 update 对象
 * @param eventTime - 事件发生时间（requestEventTime）
 * @param lane - update 的优先级
 */
export function createUpdate<State>(
  eventTime: number,
  lane: Lane,
): Update<State> {
  const update: Update<State> = {
    eventTime,
    lane,

    tag: UpdateState,
    payload: null,
    callback: null,

    next: null,
  };
  return update;
}

/**
 * 把 update 追加到 fiber 的 pending 循环链表上，并把 lane 冒泡到根
 * @param fiber - 目标 fiber
 * @param update - 待加入的 update
 * @param lane - update 的优先级
 * @returns fiber 所属的 FiberRoot
 */
export function enqueueUpdate<State>(
  fiber: FiberNode,
  update: Update<State>,
  lane: Lane,
): FiberNode | null {
  const updateQueue = fiber.updateQueue;
  if (updateQueue === null) {
    // fiber 已被卸载
    return null;
  }

  const sharedQueue: SharedQueue<State> = updateQueue.shared;

  const pending = sharedQueue.pending;
  if (pending === null) {
    // 第一条 update，自成环
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  sharedQueue.pending = update;

  return markUpdateLaneFromFiberToRoot(fiber, lane);
}

// 对照官方 markUpdateLaneFromFiberToRoot：把 lane 标记到发起更新的 fiber 及其 alternate，
// 再沿 return 路径把 lane 合并到每个祖先的 childLanes（beginWork 的 bailout 判断靠 childLanes
// 决定是否继续向下）。单 lane 模型下这条路径唯一的作用是让 root fiber 的 lanes 非空，
// 从而 updateHostRoot 不会被 attemptEarlyBailout 提前跳过。
function markUpdateLaneFromFiberToRoot(
  sourceFiber: FiberNode,
  lane: Lane,
): FiberNode | null {
  // 更新源 fiber 自己的 lanes
  sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
  let alternate = sourceFiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }

  // 沿父路径向上，更新每个祖先的 childLanes
  let parent = sourceFiber.return;
  let node: FiberNode = sourceFiber;
  while (parent !== null) {
    parent.childLanes = mergeLanes(parent.childLanes, lane);
    alternate = parent.alternate;
    if (alternate !== null) {
      alternate.childLanes = mergeLanes(alternate.childLanes, lane);
    }

    node = parent;
    parent = parent.return;
  }

  // node 现在是 HostRoot fiber
  return node;
}

// 单 lane 模型下 update 不会因优先级不足被跳过（只有 SyncLane 一条 lane），
// 但保留官方 getStateFromUpdate 的完整语义：payload 是对象则浅合并，是函数则作为 reducer 调用。
function getStateFromUpdate<State>(
  update: Update<State>,
  prevState: State,
  nextProps: any,
  instance: any,
): any {
  switch (update.tag) {
    case ReplaceState: {
      const payload = update.payload;
      if (typeof payload === "function") {
        return payload.call(instance, prevState, nextProps);
      }
      return payload;
    }
    case CaptureUpdate: {
      // 捕获的 update（错误边界重放），本项目尚未实现，直接走 UpdateState 语义
    }
    case UpdateState: {
      const payload = update.payload;
      let partialState;
      if (typeof payload === "function") {
        partialState = payload.call(instance, prevState, nextProps);
      } else {
        partialState = payload;
      }
      if (partialState === null || partialState === undefined) {
        // null/undefined 视为 no-op
        return prevState;
      }
      // 浅合并部分 state 和旧 state
      return Object.assign({}, prevState, partialState);
    }
    case ForceUpdate: {
      return prevState;
    }
  }
  return prevState;
}

// 对照官方 processUpdateQueue：把 pending 循环链表解环、追加到 base 队列，然后逐条处理
// 出新的 memoizedState。官方会按 renderLanes 跳过低优先级 update（并记录 baseState/baseUpdate
// 供后续重放），单 lane 模型下没有跳过分支，但保留解环/拼队列/循环消费的结构。
/**
 * 处理 fiber 的更新队列，计算新的 memoizedState
 * @param workInProgress - 正在处理的 fiber
 * @param props - 本次渲染的 props
 * @param instance - class 实例（HostRoot 传 null）
 * @param renderLanes - 本次渲染的 lanes
 */
export function processUpdateQueue<State>(
  workInProgress: FiberNode,
  props: any,
  instance: any,
  _renderLanes: Lanes,
): void {
  const queue: UpdateQueue<State> = workInProgress.updateQueue;

  let firstBaseUpdate = queue.firstBaseUpdate;
  let lastBaseUpdate = queue.lastBaseUpdate;

  // 检查 pending 更新，有则转移到 base 队列
  let pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    queue.shared.pending = null;

    // pending 是循环链表，断开首尾指针让它变成普通单向链表
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next!;
    lastPendingUpdate.next = null;
    // 追加 pending 到 base 队列尾部
    if (lastBaseUpdate === null) {
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate;
    }
    lastBaseUpdate = lastPendingUpdate;
  }

  if (firstBaseUpdate !== null) {
    let newState = queue.baseState;

    let update: Update<State> | null = firstBaseUpdate;
    do {
      const currentUpdate: Update<State> = update as Update<State>;
      // 单 lane 模型：所有 update 都能被处理，不保留跳过分支
      newState = getStateFromUpdate(currentUpdate, newState, props, instance);

      update = currentUpdate.next;
      if (update === null) {
        pendingQueue = queue.shared.pending;
        if (pendingQueue === null) {
          break;
        } else {
          // reducer 内部又调度了新的 pending update，追加进来继续处理
          const lastPendingUpdate = pendingQueue;
          const firstPendingUpdate = lastPendingUpdate.next!;
          lastPendingUpdate.next = null;
          update = firstPendingUpdate;
          queue.lastBaseUpdate = lastPendingUpdate;
          queue.shared.pending = null;
        }
      }
    } while (true);

    // 单 lane 模型所有 update 都会被消费，base 队列清空
    queue.baseState = newState;
    queue.firstBaseUpdate = null;
    queue.lastBaseUpdate = null;

    workInProgress.memoizedState = newState;
  }
}

// 以下两个导出与官方签名保持一致，供 workLoop 调用；单 lane 模型下 used 参数不影响结果
export function markSkippedUpdateLanes(_lane: Lane | Lanes): void {
  // 单 lane 模型无跳过的 lane，no-op
}

export function resetHasForceUpdateBeforeProcessing(): void {
  // forceUpdate 留到 Phase 8
}

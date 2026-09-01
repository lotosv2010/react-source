/**
 * @file Class/根节点更新队列
 * @description 挂载在 fiber.updateQueue 上的单向循环链表，保存组件/根节点收到的 update
 */

import {
  NoLane,
  NoLanes,
  isSubsetOfLanes,
  mergeLanes,
  type Lane,
  type Lanes,
} from "./ReactFiberLane";
import { Callback } from "./ReactFiberFlags";
import type { FiberNode } from "./ReactFiber";
import type { FiberRootNode } from "./ReactFiberRoot";
import { HostRoot } from "./ReactWorkTags";
import { markSkippedUpdateLanes } from "./ReactFiberWorkLoop";

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
): FiberRootNode | null {
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
// 决定是否继续向下）。走到根时返回 FiberRootNode（通过 HostRoot fiber 的 stateNode 取到），
// 供 scheduleUpdateOnFiber 使用。
function markUpdateLaneFromFiberToRoot(
  sourceFiber: FiberNode,
  lane: Lane,
): FiberRootNode | null {
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

  if (node.tag === HostRoot) {
    // node 现在是 HostRoot fiber，stateNode 指向 FiberRootNode
    return node.stateNode;
  }
  return null;
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

// 对照官方 processUpdateQueue：把 pending 循环链表解环、追加到 base 队列，然后按 renderLanes
// 逐条处理。优先级不足的 update 被跳过并记录进新的 base 队列（baseState 停在第一条被跳过的
// update 之前），下次高优先级渲染完成后会以这些 lane 重放，保证 update 不丢失。
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
  renderLanes: Lanes,
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

    // 同步到 current 队列：base 队列是普通单向链表，追加到两条链上可共享结构
    const current = workInProgress.alternate;
    if (current !== null) {
      const currentQueue: UpdateQueue<State> = current.updateQueue;
      const currentLastBaseUpdate = currentQueue.lastBaseUpdate;
      if (currentLastBaseUpdate !== lastBaseUpdate) {
        if (currentLastBaseUpdate === null) {
          currentQueue.firstBaseUpdate = firstPendingUpdate;
        } else {
          currentLastBaseUpdate.next = firstPendingUpdate;
        }
        currentQueue.lastBaseUpdate = lastPendingUpdate;
      }
    }
  }

  if (firstBaseUpdate !== null) {
    let newState = queue.baseState;
    let newLanes: Lanes = NoLanes;

    let newBaseState: State | null = null;
    let newFirstBaseUpdate: Update<State> | null = null;
    let newLastBaseUpdate: Update<State> | null = null;

    let update: Update<State> | null = firstBaseUpdate;
    do {
      const currentUpdate: Update<State> = update as Update<State>;
      const updateLane = currentUpdate.lane;

      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // 优先级不足：跳过。第一条被跳过的 update 之前的 state 就是新的 baseState，
        // 被跳过的 update 依次克隆进新的 base 队列，留待后续高优先级渲染完成后重放。
        const clone: Update<State> = {
          eventTime: currentUpdate.eventTime,
          lane: updateLane,

          tag: currentUpdate.tag,
          payload: currentUpdate.payload,
          callback: currentUpdate.callback,

          next: null,
        };
        if (newLastBaseUpdate === null) {
          newFirstBaseUpdate = clone;
          newLastBaseUpdate = clone;
          newBaseState = newState;
        } else {
          newLastBaseUpdate.next = clone;
          newLastBaseUpdate = clone;
        }
        // 累积被跳过的 lane，交给 markSkippedUpdateLanes 记录
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        // 优先级足够，处理该 update。若之前已经跳过过 update，本条也要克隆进 base 队列
        // （lane 置 NoLane，重放时它恒被消费），保证 base 队列重放后的结果顺序正确。
        if (newLastBaseUpdate !== null) {
          const clone: Update<State> = {
            eventTime: currentUpdate.eventTime,
            lane: NoLane,

            tag: currentUpdate.tag,
            payload: currentUpdate.payload,
            callback: currentUpdate.callback,

            next: null,
          };
          newLastBaseUpdate.next = clone;
          newLastBaseUpdate = clone;
        }

        newState = getStateFromUpdate(currentUpdate, newState, props, instance);
        const callback = currentUpdate.callback;
        if (callback !== null && currentUpdate.lane !== NoLane) {
          workInProgress.flags |= Callback;
          const effects = queue.effects;
          if (effects === null) {
            queue.effects = [currentUpdate];
          } else {
            effects.push(currentUpdate);
          }
        }
      }

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

    if (newLastBaseUpdate === null) {
      // 没有跳过的 update，baseState 直接等于最终 state
      newBaseState = newState;
    }

    queue.baseState = newBaseState as State;
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;

    // 把被跳过的 lane 写回 workInProgress.lanes，供下次渲染据此调度
    markSkippedUpdateLanes(newLanes);
    workInProgress.lanes = newLanes;
    workInProgress.memoizedState = newState;
  }
}

export function resetHasForceUpdateBeforeProcessing(): void {
  // forceUpdate 留到 Phase 8
}

/**
 * @file 并发更新入队
 * @description 对照官方 packages/react-reconciler/src/ReactFiberConcurrentUpdates.new.js：
 * 并发渲染期间收到的 update（hook dispatch / class setState）不直接挂到 fiber 的
 * updateQueue 上，而是先记录到这个模块级队列，避免渲染中的 workInProgress 树被并发触发的
 * update 污染；等到下一次进入渲染（prepareFreshStack）或本次渲染完成时，
 * finishQueueingConcurrentUpdates 统一把暂存的 update 刷回各自的 updateQueue，
 * 同时把 lane 冒泡到 root——取代原来 ReactFiberClassUpdateQueue 里"入队即冒泡"的做法。
 */

import type { FiberNode } from "./ReactFiber";
import type { FiberRootNode } from "./ReactFiberRoot";
import { mergeLanes, NoLane, type Lane } from "./ReactFiberLane";
import { HostRoot } from "./ReactWorkTags";

export interface ConcurrentUpdate {
  next: ConcurrentUpdate;
  lane: Lane;
}

interface ConcurrentQueue {
  pending: ConcurrentUpdate | null;
}

// 暂存待入队的 (fiber, queue, update, lane) 四元组，按下标平铺存储在同一个数组里
// （官方写法：避免为每条 update 分配一个额外的小对象）
const concurrentQueues: any[] = [];
let concurrentQueuesIndex = 0;

function enqueueUpdate(
  fiber: FiberNode,
  queue: ConcurrentQueue | null,
  update: ConcurrentUpdate | null,
  lane: Lane,
): void {
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;

  // fiber.lanes 在一些地方（beginWork 的提前 bailout 判断）需要立刻可见，不能等到
  // finishQueueingConcurrentUpdates 才更新；childLanes 的冒泡则可以延迟到那时再做。
  fiber.lanes = mergeLanes(fiber.lanes, lane);
  const alternate = fiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }
}

// 对照官方 markUpdateLaneFromFiberToRoot（现迁移到本文件）：只负责把 lane 沿 return 链
// 冒泡到每个祖先的 childLanes，fiber 自身的 lanes 已经在 enqueueUpdate 里更新过，这里不重复。
function markUpdateLaneFromFiberToRoot(
  sourceFiber: FiberNode,
  lane: Lane,
): FiberRootNode | null {
  let parent = sourceFiber.return;
  let node: FiberNode = sourceFiber;
  while (parent !== null) {
    parent.childLanes = mergeLanes(parent.childLanes, lane);
    const alternate = parent.alternate;
    if (alternate !== null) {
      alternate.childLanes = mergeLanes(alternate.childLanes, lane);
    }
    node = parent;
    parent = parent.return;
  }
  if (node.tag === HostRoot) {
    return node.stateNode;
  }
  return null;
}

/**
 * 把暂存的 update 刷回各自 fiber 的 updateQueue，并把 lane 冒泡到 root
 * 调用时机：prepareFreshStack（渲染开始前）与渲染完成时，保证下一次遍历 Fiber 树读到的
 * updateQueue 一定是最新的
 */
export function finishQueueingConcurrentUpdates(): void {
  const endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;

  let i = 0;
  while (i < endIndex) {
    const fiber: FiberNode = concurrentQueues[i++];
    const queue: ConcurrentQueue | null = concurrentQueues[i++];
    const update: ConcurrentUpdate | null = concurrentQueues[i++];
    const lane: Lane = concurrentQueues[i++];
    concurrentQueues[i - 4] = null;
    concurrentQueues[i - 3] = null;
    concurrentQueues[i - 2] = null;
    concurrentQueues[i - 1] = null;

    if (queue !== null && update !== null) {
      const pending = queue.pending;
      if (pending === null) {
        // 第一条 update，自成环
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }

    if (lane !== NoLane) {
      markUpdateLaneFromFiberToRoot(fiber, lane);
    }
  }
}

/**
 * hook（useState/useReducer）的 dispatch 入队入口
 */
export function enqueueConcurrentHookUpdate(
  fiber: FiberNode,
  queue: any,
  update: any,
  lane: Lane,
): FiberRootNode | null {
  enqueueUpdate(fiber, queue, update, lane);
  return getRootForUpdatedFiber(fiber);
}

/**
 * class 组件 / HostRoot 的 update 入队入口（取代 ReactFiberClassUpdateQueue 原先
 * 立即冒泡的 enqueueUpdate 实现）
 */
export function enqueueConcurrentClassUpdate(
  fiber: FiberNode,
  queue: any,
  update: any,
  lane: Lane,
): FiberRootNode | null {
  enqueueUpdate(fiber, queue, update, lane);
  return getRootForUpdatedFiber(fiber);
}

// 对照官方 getRootForUpdatedFiber：沿 return 指针一路走到根，取 HostRoot fiber 的
// stateNode（即 FiberRootNode）。这一步不依赖 update 是否已经真正入队，纯粹是结构遍历。
function getRootForUpdatedFiber(sourceFiber: FiberNode): FiberRootNode | null {
  let node = sourceFiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  return node.tag === HostRoot ? node.stateNode : null;
}

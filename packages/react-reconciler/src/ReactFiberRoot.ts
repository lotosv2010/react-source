/**
 * @file FiberRoot 节点
 * @description FiberRootNode 是整棵 Fiber 树的根容器，current 指向当前已提交的 HostRoot fiber
 */

import type { FiberNode } from "./ReactFiber";
import { createHostRootFiber } from "./ReactFiber";
import { NoLane, NoLanes, type Lane, type Lanes } from "./ReactFiberLane";
import type { RootTag } from "./ReactRootTags";
import { initializeUpdateQueue } from "./ReactFiberClassUpdateQueue";

// 对照官方 packages/react-reconciler/src/ReactFiberRoot.new.js：官方 FiberRootNode 还带
// 大量优先级/调度字段（eventTimes、expirationTimes、entangledLanes 等），这些服务于
// Scheduler 时间切片与 lane 抢占。Phase 2/3 只有同步渲染，先只保留主链路用得到的字段，
// Phase 4 接入 Scheduler 时再补。

// HostRoot fiber 的 memoizedState 是一个 { element } 对象，updateHostRoot 从里面取本次要
// 渲染的 ReactElement（updateContainer 时作为 update.payload 写入）。
export interface RootState {
  element: any;
}

export class FiberRootNode {
  tag: RootTag;
  containerInfo: any;
  current: FiberNode;
  finishedWork: FiberNode | null;
  finishedLanes: Lanes;
  pendingLanes: Lanes;
  callbackNode: any;
  callbackPriority: Lane;
  context: any;
  pendingContext: any;

  constructor(containerInfo: any, tag: RootTag) {
    this.tag = tag;
    this.containerInfo = containerInfo;
    this.current = null as unknown as FiberNode;
    this.finishedWork = null;
    this.finishedLanes = NoLanes;
    this.pendingLanes = NoLanes;
    this.callbackNode = null;
    this.callbackPriority = NoLane;
    this.context = null;
    this.pendingContext = null;
  }
}

/**
 * 创建 FiberRoot，并把 containerInfo 上的 HostRoot fiber 与 root 互相指向
 * @param containerInfo - 渲染器提供的容器（如 DOM 元素）
 * @param tag - 根节点的渲染模式（LegacyRoot/ConcurrentRoot）
 * @param initialChildren - 初始渲染的 children（createContainer 传 null，hydrateRoot 才传实际内容）
 * @returns FiberRootNode
 */
export function createFiberRoot(
  containerInfo: any,
  tag: RootTag,
  initialChildren: any,
): FiberRootNode {
  const root = new FiberRootNode(containerInfo, tag);

  // 循环构造：HostRoot fiber 的 stateNode 指向 root，root.current 指向该 fiber
  const uninitializedFiber = createHostRootFiber(tag);
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  const initialState: RootState = {
    element: initialChildren,
  };
  uninitializedFiber.memoizedState = initialState;

  initializeUpdateQueue(uninitializedFiber);

  return root;
}

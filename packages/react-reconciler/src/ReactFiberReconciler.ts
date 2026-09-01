/**
 * @file react-reconciler 对外入口
 * @description createContainer / updateContainer 是渲染器（react-dom）调用 reconciler 的
 * 挂载/更新入口，对应官方 ReactFiberReconciler.new.js 的同名导出
 */

import { createFiberRoot, type FiberRootNode } from "./ReactFiberRoot";
import { createUpdate, enqueueUpdate } from "./ReactFiberClassUpdateQueue";
import type { FiberNode } from "./ReactFiber";
import { NoLane, type Lane } from "./ReactFiberLane";
import type { RootTag } from "./ReactRootTags";
import {
  requestEventTime,
  requestUpdateLane,
  scheduleUpdateOnFiber,
} from "./ReactFiberWorkLoop";

// 官方 host config 由渲染器在构建时通过 fork 注入（forks/ReactFiberHostConfig.custom.js），
// 本项目改为运行时注入：渲染器（react-dom 或测试宿主）调用 setHostConfig 注入实现。
export { setHostConfig } from "./ReactFiberHostConfig";
export type { HostConfig } from "./ReactFiberHostConfig";

export type { FiberRootNode };

/**
 * 创建容器（FiberRoot），对应 ReactDOM.createRoot 底层调用的入口
 * @param containerInfo - 渲染器提供的容器（如 DOM 元素）
 * @param tag - 根节点的渲染模式（LegacyRoot/ConcurrentRoot）
 * @returns FiberRootNode
 */
export function createContainer(
  containerInfo: any,
  tag: RootTag,
): FiberRootNode {
  return createFiberRoot(containerInfo, tag, null);
}

/**
 * 更新容器：把新的 ReactElement 挂到根 fiber 的更新队列并触发渲染
 * @param element - 新的 ReactElement 树
 * @param container - createContainer 返回的 FiberRoot
 * @param callback - 提交完成后的回调（留到 commitRoot 的 layout 阶段消费，当前未执行）
 * @returns 本次更新的 lane
 */
export function updateContainer(
  element: any,
  container: FiberRootNode,
  callback?: (() => void) | null,
): Lane {
  const current: FiberNode = container.current;
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(current);

  const update = createUpdate(eventTime, lane);
  // DevTools 依赖这个字段名叫 "element"
  update.payload = { element };
  if (callback !== undefined && callback !== null) {
    update.callback = callback;
  }

  const root = enqueueUpdate(current, update, lane);
  if (root !== null) {
    scheduleUpdateOnFiber(container, current, lane);
  }

  return lane;
}

export { NoLane };

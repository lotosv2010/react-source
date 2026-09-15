/**
 * @file render 阶段抛错处理
 * @description 对照官方 packages/react-reconciler/src/ReactFiberThrow.js：workLoop 捕获到
 * render 阶段的 throw 后调用 throwException——给抛错的 fiber 打 Incomplete，沿 return 链向上
 * 找最近的错误边界（class 组件实现 getDerivedStateFromError/componentDidCatch），命中就打
 * ShouldCapture 并塞一条 CaptureUpdate；找不到则兜底在 HostRoot 卸载整棵树。
 *
 * 简化范围：只处理 render 阶段的错误边界（class 组件），不含 Suspense 的 Promise 分支
 * （Wakeable/thenable 判断留到 Phase 9.1 落地时补），也不追踪 componentStack。
 */

import type { FiberNode } from "./ReactFiber";
import type { FiberRootNode } from "./ReactFiberRoot";
import { ClassComponent, HostRoot } from "./ReactWorkTags";
import { ShouldCapture, Incomplete } from "./ReactFiberFlags";
import { getHighestPriorityLane, type Lanes } from "./ReactFiberLane";
import {
  CaptureUpdate,
  createUpdate,
  enqueueCapturedUpdate,
  type Update,
} from "./ReactFiberClassUpdateQueue";

// 对照官方 createClassErrorUpdate：payload/callback 复用现有消费链路——payload 走
// processUpdateQueue 的浅合并语义（getDerivedStateFromError 返回值即 partial state），
// callback 走 commitClassCallbacks（layout 子阶段统一执行），不需要为 componentDidCatch
// 新增专门的 commit 分支。
function createClassErrorUpdate(
  boundaryFiber: FiberNode,
  error: any,
  lane: any,
): Update<any> {
  const update = createUpdate<any>(0, lane);
  update.tag = CaptureUpdate;

  const instance = boundaryFiber.stateNode;
  const Component = boundaryFiber.type;
  if (typeof Component.getDerivedStateFromError === "function") {
    update.payload = () => Component.getDerivedStateFromError(error);
  }

  if (instance !== null && typeof instance.componentDidCatch === "function") {
    update.callback = () => {
      instance.componentDidCatch(error, { componentStack: "" });
    };
  }

  return update;
}

// 兜底：整棵树都没有错误边界时，直接卸载 HostRoot 的 children（element: null），
// 并把错误打到控制台（不做 componentStack 追踪）
function createRootErrorUpdate(error: any, lane: any): Update<any> {
  const update = createUpdate<any>(0, lane);
  update.tag = CaptureUpdate;
  update.payload = { element: null };
  update.callback = () => {
    console.error(error);
  };
  return update;
}

export function throwException(
  _root: FiberRootNode,
  returnFiber: FiberNode | null,
  sourceFiber: FiberNode,
  value: any,
  renderLanes: Lanes,
): void {
  sourceFiber.flags |= Incomplete;

  const lane = getHighestPriorityLane(renderLanes);

  let workInProgress: FiberNode | null = returnFiber;
  while (workInProgress !== null) {
    switch (workInProgress.tag) {
      case HostRoot: {
        const update = createRootErrorUpdate(value, lane);
        enqueueCapturedUpdate(workInProgress, update);
        workInProgress.flags |= ShouldCapture;
        return;
      }
      case ClassComponent: {
        const instance = workInProgress.stateNode;
        const ctor = workInProgress.type;
        const canCapture =
          (workInProgress.flags & ShouldCapture) === 0 &&
          (typeof ctor.getDerivedStateFromError === "function" ||
            (instance !== null &&
              typeof instance.componentDidCatch === "function"));
        if (canCapture) {
          const update = createClassErrorUpdate(workInProgress, value, lane);
          enqueueCapturedUpdate(workInProgress, update);
          workInProgress.flags |= ShouldCapture;
          return;
        }
        break;
      }
    }
    workInProgress = workInProgress.return;
  }
}

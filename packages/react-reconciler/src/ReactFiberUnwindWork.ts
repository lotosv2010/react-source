/**
 * @file unwind：completeUnitOfWork 的 Incomplete 分支专用
 * @description 对照官方 packages/react-reconciler/src/ReactFiberUnwindWork.js：沿 return 链
 * 向上找到 throwException 标记了 ShouldCapture 的边界 fiber，把它翻转成 DidCapture 并作为
 * 下一个 workInProgress 重新进入 beginWork（渡染 fallback）；路过的 ContextProvider 等带栈
 * 结构的 fiber 需要主动 pop，否则栈会因为它跳过了自己的 completeWork 而错位。
 */

import type { FiberNode } from "./ReactFiber";
import { ClassComponent, ContextProvider, HostRoot } from "./ReactWorkTags";
import { DidCapture, NoFlags, ShouldCapture } from "./ReactFiberFlags";
import { popProvider } from "./ReactFiberNewContext";
import type { ReactContext } from "shared/ReactTypes";

export function unwindWork(workInProgress: FiberNode): FiberNode | null {
  switch (workInProgress.tag) {
    case ClassComponent:
    case HostRoot: {
      const flags = workInProgress.flags;
      if ((flags & ShouldCapture) !== NoFlags) {
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        return workInProgress;
      }
      return null;
    }
    case ContextProvider: {
      const context: ReactContext<any> = workInProgress.type._context;
      popProvider(context, workInProgress);
      return null;
    }
    default:
      return null;
  }
}

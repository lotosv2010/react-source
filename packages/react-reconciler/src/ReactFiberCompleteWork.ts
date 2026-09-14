/**
 * @file completeWork（Fiber 树构建 - 向上归阶段）
 * @description 对 Fiber 执行"归"阶段：创建真实 DOM 节点（HostComponent/HostText），
 * 把子节点的副作用标记汇总到父节点（bubbleProperties）
 */

import type { ReactContext } from "shared/ReactTypes";

import type { FiberNode } from "./ReactFiber";
import { NoFlags, Update, type Flags } from "./ReactFiberFlags";
import {
  appendInitialChild,
  createInstance,
  createTextInstance,
  finalizeInitialChildren,
  getHostContext,
  getRootHostContainer,
  prepareUpdate,
  supportsMutation,
} from "./ReactFiberConfig";
import { NoLanes, mergeLanes, type Lanes } from "./ReactFiberLane";
import { popProvider } from "./ReactFiberNewContext";
import {
  ClassComponent,
  ContextConsumer,
  ContextProvider,
  ForwardRef,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostPortal,
  HostRoot,
  HostText,
  IndeterminateComponent,
  MemoComponent,
  Mode,
} from "./ReactWorkTags";

function markUpdate(workInProgress: FiberNode): void {
  // 打 Update 标记：让 Placement 变成 PlacementAndUpdate
  workInProgress.flags |= Update;
}

// 对照官方 appendAllChildren（mutation 模式）：completeWork 创建父节点时，子节点的真实 DOM
// 已经在各自的 completeWork 里创建好了（挂在 fiber.stateNode），这里深度优先把子树里所有
// HostComponent/HostText 的 stateNode append 到父节点，完成真实 DOM 树的组装。
function appendAllChildren(
  parent: any,
  workInProgress: FiberNode,
  _needsVisibilityToggle: boolean,
  _isHidden: boolean,
): void {
  if (!supportsMutation) {
    return;
  }
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.tag === HostPortal) {
      // portal 的子节点不挂到当前树，由 portal 自己的 commit 处理
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === workInProgress) {
      return;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

// 对照官方 updateHostComponent（mutation 模式）：更新时对比新旧 props，生成 updatePayload
// 挂到 fiber.updateQueue，等 commit 阶段 commitUpdate 消费。
function updateHostComponent(
  current: FiberNode,
  workInProgress: FiberNode,
  type: any,
  newProps: any,
): void {
  const oldProps = current.memoizedProps;
  if (oldProps === newProps) {
    // mutation 模式下 props 没变就可以直接 bailout（子节点的变更不影响这个节点）
    return;
  }

  const instance = workInProgress.stateNode;
  const currentHostContext = getHostContext();
  const updatePayload = prepareUpdate(
    instance,
    type,
    oldProps,
    newProps,
    getRootHostContainer(),
    currentHostContext,
  );
  workInProgress.updateQueue = updatePayload;
  // 只有真正有变化（updatePayload 非空）才标记 Update
  if (updatePayload) {
    markUpdate(workInProgress);
  }
}

function updateHostText(
  _current: FiberNode,
  workInProgress: FiberNode,
  oldText: string,
  newText: string,
): void {
  // 文本变了就标记 Update，具体更新在 commitWork
  if (oldText !== newText) {
    markUpdate(workInProgress);
  }
}

// 对照官方 bubbleProperties：把子树的 flags/lanes 汇总到父节点。didBailout 时只冒泡静态标记
// （本项目 StaticMask 目前只有 RefStatic，实际为空集），非 bailout 时冒泡全部 flags。
// 同时把子树里最早的优先级冒泡到 childLanes。
function bubbleProperties(completedWork: FiberNode): boolean {
  const didBailout =
    completedWork.alternate !== null &&
    completedWork.alternate.child === completedWork.child;

  let newChildLanes: Lanes = NoLanes;
  let subtreeFlags: Flags = NoFlags;

  let child = completedWork.child;
  while (child !== null) {
    newChildLanes = mergeLanes(
      newChildLanes,
      mergeLanes(child.lanes, child.childLanes),
    );

    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;

    // 修正 return 指针，保证整棵树结构一致（假定 commit 阶段不与 render 阶段并发）
    child.return = completedWork;

    child = child.sibling;
  }

  completedWork.subtreeFlags |= subtreeFlags;
  completedWork.childLanes = newChildLanes;

  return didBailout;
}

function completeWork(
  current: FiberNode | null,
  workInProgress: FiberNode,
  _renderLanes: Lanes,
): FiberNode | null {
  const newProps = workInProgress.pendingProps;

  switch (workInProgress.tag) {
    case IndeterminateComponent:
    case FunctionComponent:
    case ClassComponent:
    case Fragment:
    case Mode:
    case ContextConsumer:
    case ForwardRef:
    case MemoComponent:
      bubbleProperties(workInProgress);
      return null;
    case ContextProvider: {
      const context: ReactContext<any> = workInProgress.type._context;
      popProvider(context, workInProgress);
      bubbleProperties(workInProgress);
      return null;
    }
    case HostRoot: {
      const fiberRoot = workInProgress.stateNode;
      if (fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext;
        fiberRoot.pendingContext = null;
      }
      bubbleProperties(workInProgress);
      return null;
    }
    case HostComponent: {
      const type = workInProgress.type;
      if (current !== null && workInProgress.stateNode != null) {
        updateHostComponent(current, workInProgress, type, newProps);
        // ref 变更标记留到 Phase 9 forwardRef 落地时补
      } else {
        if (!newProps) {
          if (workInProgress.stateNode === null) {
            throw new Error(
              "We must have new props for new mounts. This error is likely " +
                "caused by a bug in React. Please file an issue.",
            );
          }
          // 中断恢复场景（abort work），本项目尚未实现可中断渲染
          bubbleProperties(workInProgress);
          return null;
        }

        const currentHostContext = getHostContext();
        const instance = createInstance(
          type,
          newProps,
          getRootHostContainer(),
          currentHostContext,
          workInProgress,
        );

        appendAllChildren(instance, workInProgress, false, false);

        workInProgress.stateNode = instance;

        // 某些渲染器需要在 commit 阶段执行的初始副作用（如 DOM 的 autofocus）
        if (
          finalizeInitialChildren(
            instance,
            type,
            newProps,
            getRootHostContainer(),
            currentHostContext,
          )
        ) {
          markUpdate(workInProgress);
        }
      }
      bubbleProperties(workInProgress);
      return null;
    }
    case HostText: {
      const newText = newProps;
      if (current !== null && workInProgress.stateNode != null) {
        const oldText = current.memoizedProps;
        updateHostText(current, workInProgress, oldText, newText);
      } else {
        if (typeof newText !== "string") {
          if (workInProgress.stateNode === null) {
            throw new Error(
              "We must have new props for new mounts. This error is likely " +
                "caused by a bug in React. Please file an issue.",
            );
          }
          // 中断恢复场景
        }
        workInProgress.stateNode = createTextInstance(
          newText,
          getRootHostContainer(),
          getHostContext(),
          workInProgress,
        );
      }
      bubbleProperties(workInProgress);
      return null;
    }
  }

  throw new Error(
    `Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
      "React. Please file an issue.",
  );
}

export { completeWork };

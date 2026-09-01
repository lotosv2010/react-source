/**
 * @file beginWork（Fiber 树构建 - 向下递阶段）
 * @description 对每个 Fiber 执行"递"阶段：根据 tag 分发，计算新 props/state，reconcile 出子 fiber
 */

import {
  cloneChildFibers,
  mountChildFibers,
  reconcileChildFibers,
} from "./ReactChildFiber";
import {
  cloneUpdateQueue,
  processUpdateQueue,
} from "./ReactFiberClassUpdateQueue";
import type { FiberNode } from "./ReactFiber";
import { DidCapture, NoFlags, PerformedWork } from "./ReactFiberFlags";
import { NoLanes, includesSomeLane, type Lanes } from "./ReactFiberLane";
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
  Mode,
} from "./ReactWorkTags";

// 模块级状态：本次 beginWork 是否接收到了新的 props/state/context。
// 官方用 didReceiveUpdate 在 dispatch 顶层与各 update* 分支之间传递"是否要重渲染"的信号，
// 函数组件渲染结束后据此决定是 bailout 还是继续 reconcile children。
let didReceiveUpdate = false;

/**
 * 对比 current 与新 children，决定复用/新建/删除子 fiber
 * @param current - current 树上的对应 fiber
 * @param workInProgress - workInProgress fiber
 * @param nextChildren - 新的 children
 * @param renderLanes - 本次渲染的 lanes
 */
export function reconcileChildren(
  current: FiberNode | null,
  workInProgress: FiberNode,
  nextChildren: any,
  renderLanes: Lanes,
): void {
  if (current === null) {
    // 全新的组件，子 fiber 全部新建；用 mountChildFibers（不标记副作用），
    // 父 fiber 自身已是 Placement，commit 阶段只挂顶层节点即可
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes,
    );
  } else {
    // 复用/更新：标记 Placement/ChildDeletion
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes,
    );
  }
}

// 对照官方 renderWithHooks：Phase 5 接入 hooks 时会替换为真正的实现（切换 Dispatcher、
// 建立 Hook 链表、设置 ReactCurrentOwner）。当前直接调用函数组件拿 children。
function renderWithHooks(
  _current: FiberNode | null,
  _workInProgress: FiberNode,
  Component: any,
  props: any,
  _context: any,
  _renderLanes: Lanes,
): any {
  return Component(props);
}

// 官方用 shouldConstruct（看 type.prototype 是否 extends React.Component）区分 class/function，
// class 组件留到 Phase 8。这里 mountIndeterminateComponent 一律按函数组件定型。
function mountIndeterminateComponent(
  _current: FiberNode | null,
  workInProgress: FiberNode,
  Component: any,
  renderLanes: Lanes,
): FiberNode | null {
  const props = workInProgress.pendingProps;

  const value = renderWithHooks(
    null,
    workInProgress,
    Component,
    props,
    null,
    renderLanes,
  );

  // DevTools 读取这个 flag 判断组件是否执行过
  workInProgress.flags |= PerformedWork;

  // 暂按函数组件定型（官方这里还会探测"返回 class 实例"的 module pattern 组件，留到 Phase 8）
  workInProgress.tag = FunctionComponent;

  reconcileChildren(null, workInProgress, value, renderLanes);
  return workInProgress.child;
}

function updateFunctionComponent(
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
): FiberNode | null {
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    null,
    renderLanes,
  );

  if (current !== null && !didReceiveUpdate) {
    // 没有新的 props/state，children 不变，bailout
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostRoot(
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  if (current === null) {
    throw new Error("Should have a current fiber. This is a bug in React.");
  }

  const nextProps = workInProgress.pendingProps;
  const prevState = workInProgress.memoizedState;
  const prevChildren = prevState.element;

  cloneUpdateQueue(current, workInProgress);
  processUpdateQueue(workInProgress, nextProps, null, renderLanes);

  const nextState = workInProgress.memoizedState;
  // 官方注释：DevTools 依赖这个字段名叫 "element"
  const nextChildren = nextState.element;

  if (nextChildren === prevChildren) {
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostComponent(
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  const nextProps = workInProgress.pendingProps;
  // 官方这里还有 shouldSetTextContent 的直接文本子节点优化（textarea/option/input 等
  // 直接把 children 当 textContent、不再生成 HostText fiber），等 react-dom 落地时补。
  // ref 的 markRef 标记也留到 Phase 9 forwardRef 落地时补。
  const nextChildren = nextProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostText(
  _current: FiberNode | null,
  _workInProgress: FiberNode,
): null {
  // 文本节点是终态，没有 children，complete 阶段紧接着处理
  return null;
}

function updateFragment(
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  const nextChildren = workInProgress.pendingProps;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateMode(
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  const nextChildren = workInProgress.pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

// legacy context 未实现，恒返回 false（官方在 hasLegacyContextChanged 里对比 context 栈）
function hasLegacyContextChanged(): boolean {
  return false;
}

function checkScheduledUpdateOrContext(
  current: FiberNode,
  renderLanes: Lanes,
): boolean {
  // 提前 bailout 前，检查是否有待处理的更新（context 懒传播留到 Phase 7）
  const updateLanes = current.lanes;
  return includesSomeLane(updateLanes, renderLanes);
}

function attemptEarlyBailoutIfNoScheduledUpdate(
  current: FiberNode,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  // 官方这里会按 tag 把 host context / provider 等压栈。Phase 2/3 的 host config 没有
  // context 栈（getHostContext 恒返回空对象），压栈操作先省略，react-dom 落地时补。
  return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
}

function bailoutOnAlreadyFinishedWork(
  current: FiberNode,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  if (current !== null) {
    // 复用上一次的依赖
    workInProgress.dependencies = current.dependencies;
  }

  // 检查子节点是否有待处理的工作
  if (!includesSomeLane(renderLanes, workInProgress.childLanes)) {
    // 子节点也没有工作，整棵子树跳过
    return null;
  }

  // 子树有工作，克隆子 fiber 继续向下
  cloneChildFibers(current, workInProgress);
  return workInProgress.child;
}

function beginWork(
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;

    if (oldProps !== newProps || hasLegacyContextChanged()) {
      // props 或 legacy context 变了，标记需要重渲染
      didReceiveUpdate = true;
    } else {
      // props 与 legacy context 都没变，检查是否有待处理的更新
      const hasScheduledUpdateOrContext = checkScheduledUpdateOrContext(
        current,
        renderLanes,
      );
      if (
        !hasScheduledUpdateOrContext &&
        // 错误/挂起边界的第二遍渲染可能没有调度在 current 上的工作，用这个 flag 兜底
        (workInProgress.flags & DidCapture) === NoFlags
      ) {
        didReceiveUpdate = false;
        return attemptEarlyBailoutIfNoScheduledUpdate(
          current,
          workInProgress,
          renderLanes,
        );
      }
      // 有更新调度，但 props/context 没变：置 false，updateQueue 或 context 真正产生变化时会置 true
      didReceiveUpdate = false;
    }
  } else {
    didReceiveUpdate = false;
  }

  // 进入 begin 阶段前清空待处理优先级
  workInProgress.lanes = NoLanes;

  switch (workInProgress.tag) {
    case IndeterminateComponent: {
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
        renderLanes,
      );
    }
    case FunctionComponent: {
      const Component = workInProgress.type;
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        workInProgress.pendingProps,
        renderLanes,
      );
    }
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
    case Fragment:
      return updateFragment(current, workInProgress, renderLanes);
    case Mode:
      return updateMode(current, workInProgress, renderLanes);
  }

  throw new Error(
    `Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
      "React. Please file an issue.",
  );
}

export { beginWork };

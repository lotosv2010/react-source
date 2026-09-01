/**
 * @file workLoop（调度入口 + 工作循环 + commit 总控）
 * @description 从 scheduleUpdateOnFiber 进入，prepareFreshStack 建 workInProgress 树，
 * performUnitOfWork 逐节点 beginWork/completeWork，树完成后 commitRoot 提交到 DOM
 */

import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import { commitMutationEffects } from "./ReactFiberCommitWork";
import type { FiberNode } from "./ReactFiber";
import { createWorkInProgress } from "./ReactFiber";
import { Incomplete, NoFlags } from "./ReactFiberFlags";
import {
  NoLanes,
  SyncLane,
  includesSomeLane,
  mergeLanes,
  type Lane,
  type Lanes,
} from "./ReactFiberLane";
import type { FiberRootNode } from "./ReactFiberRoot";

// ExecutionContext 位掩码：标记当前处于渲染还是提交阶段。官方还有 BatchedContext/
// EventContext 等，用于批量更新与事件系统（Phase 4/6），这里先只保留两个主阶段标记。
const NoContext = 0b000;
const RenderContext = 0b010;
const CommitContext = 0b100;

// 根节点的渲染退出状态，数值与官方一致（completeUnitOfWork/performSyncWorkOnRoot 据此判断）
const RootInProgress = 0;
const RootCompleted = 5;

// 当前正在处理的 fiber 树根 / 当前处理到的 fiber / 本次渲染的 lanes
let workInProgressRoot: FiberRootNode | null = null;
let workInProgress: FiberNode | null = null;
let workInProgressRootRenderLanes: Lanes = NoLanes;
let workInProgressRootExitStatus = RootInProgress;

let executionContext: number = NoContext;

export function getExecutionContext(): number {
  return executionContext;
}

// 对照官方 requestEventTime / now()：事件发生时间用于 update 排序与过期判断，
// 单 lane 同步模型下只是记录在 Update.eventTime 上，实际不再参与优先级计算。
export function requestEventTime(): number {
  return performance.now();
}

// 对照官方 requestUpdateLane：根据 fiber 的 mode 和调度上下文分配 lane。Phase 2/3 只有
// 同步渲染，恒返回 SyncLane；Phase 4 接入 Scheduler 后按事件优先级分配不同 lane。
export function requestUpdateLane(_fiber: FiberNode): Lane {
  return SyncLane;
}

// 对照官方 prepareFreshStack：重置 root 的 finished 状态，并把 root.current 克隆成新的
// workInProgress 树根。可中断渲染未实现，中断工作（workInProgress 非空）直接断言。
function prepareFreshStack(root: FiberRootNode, lanes: Lanes): FiberNode {
  root.finishedWork = null;
  root.finishedLanes = NoLanes;

  workInProgressRoot = root;
  const rootWorkInProgress = createWorkInProgress(root.current, null);
  workInProgress = rootWorkInProgress;
  workInProgressRootRenderLanes = lanes;
  workInProgressRootExitStatus = RootInProgress;

  return rootWorkInProgress;
}

// 对照官方 workLoopSync：同步模式不检查 shouldYield，一口气处理完整棵树。
function workLoopSync(): void {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// 对照官方 performUnitOfWork：对单个 fiber 先 beginWork，返回 null 说明没有子节点可继续，
// 就 completeUnitOfWork 向上归；否则继续处理返回的子 fiber。
function performUnitOfWork(unitOfWork: FiberNode): void {
  // current 树的状态就是 unitOfWork.alternate（这是官方在渲染阶段复用 alternate 字段的约定，
  // 省一个额外的字段）
  const current = unitOfWork.alternate;

  const next: FiberNode | null = beginWork(
    current,
    unitOfWork,
    workInProgressRootRenderLanes,
  );

  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    // 没有新子节点，完成当前节点
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }
}

// 对照官方 completeUnitOfWork：完成当前节点后尝试处理兄弟节点，没有兄弟就回到父节点。
// 到达根节点时把退出状态置为 RootCompleted。
function completeUnitOfWork(unitOfWork: FiberNode): void {
  let completedWork: FiberNode | null = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber: FiberNode | null = completedWork.return;

    if ((completedWork.flags & Incomplete) === NoFlags) {
      const next = completeWork(
        current,
        completedWork,
        workInProgressRootRenderLanes,
      );

      if (next !== null) {
        // completeWork 派生了新工作（如 Suspense fallback），继续处理
        workInProgress = next;
        return;
      }
    } else {
      // 节点因抛错未完成，unwind 留到错误处理落地时实现
    }

    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      // 有兄弟节点，处理兄弟
      workInProgress = siblingFiber;
      return;
    }
    // 没有兄弟，回到父节点
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);

  // 到达根节点
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}

// 对照官方 renderRootSync：进入 RenderContext，必要时准备新栈，跑同步 workLoop。
function renderRootSync(root: FiberRootNode, lanes: Lanes): number {
  const prevExecutionContext = executionContext;
  executionContext |= RenderContext;

  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }

  workLoopSync();

  executionContext = prevExecutionContext;

  if (workInProgress !== null) {
    // 同步渲染必须完成整棵树
    throw new Error(
      "Cannot commit an incomplete root. This error is likely caused by a " +
        "bug in React. Please file an issue.",
    );
  }

  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;

  return workInProgressRootExitStatus;
}

// 对照官方 commitRoot（精简为只有 mutation 子阶段）：提交 finishedWork，
// 应用所有 DOM 变更后交换 current 指针，workInProgress 树变成新的 current 树。
function commitRoot(root: FiberRootNode): void {
  const finishedWork = root.finishedWork;
  if (finishedWork === null) {
    return;
  }

  const lanes = root.finishedLanes;
  root.finishedWork = null;
  root.finishedLanes = NoLanes;
  root.pendingLanes = NoLanes;

  const prevExecutionContext = executionContext;
  executionContext |= CommitContext;

  // mutation 子阶段：插入/更新/删除 DOM（before-mutation / layout 子阶段留到后续）
  commitMutationEffects(root, finishedWork, lanes);

  // 双缓存树交换：workInProgress 树提交后成为新的 current 树
  root.current = finishedWork;

  executionContext = prevExecutionContext;
}

// 对照官方 performSyncWorkOnRoot：取待处理的 lanes，同步渲染并提交。
function performSyncWorkOnRoot(root: FiberRootNode): null {
  const lanes = root.pendingLanes;
  if (!includesSomeLane(lanes, SyncLane)) {
    // 没有剩余同步工作
    return null;
  }

  const exitStatus = renderRootSync(root, lanes);

  if (exitStatus === RootCompleted) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(root);
  }

  return null;
}

// 对照官方 scheduleUpdateOnFiber：把 lane 标记到 root.pendingLanes，触发同步调度。
// 官方这里还有 render 阶段更新、act 警告、批处理等大量分支（Phase 4/6），同步模型下
// 直接在调用栈里执行 performSyncWorkOnRoot。
export function scheduleUpdateOnFiber(
  root: FiberRootNode,
  _fiber: FiberNode,
  lane: Lane,
): void {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane);

  // Phase 4 接入 Scheduler 后，这里会根据 lane 选择同步执行还是 scheduleCallback。
  // 当前只有 SyncLane，直接同步 flush。
  performSyncWorkOnRoot(root);
}

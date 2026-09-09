/**
 * @file workLoop（调度入口 + 工作循环 + commit 总控）
 * @description 从 scheduleUpdateOnFiber 进入，ensureRootIsScheduled 按 lane 选择同步 flush
 * 或交给 Scheduler 分片执行；workLoopConcurrent 每次处理一个 Fiber 后检查 shouldYield，
 * 时间片用完就中断并交还主线程，下一段从中断点恢复。
 */

import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import { commitMutationEffects } from "./ReactFiberCommitWork";
import type { FiberNode } from "./ReactFiber";
import { createWorkInProgress } from "./ReactFiber";
import { Incomplete, NoFlags } from "./ReactFiberFlags";
import {
  DefaultLane,
  NoLane,
  NoLanes,
  NoTimestamp,
  SyncLane,
  getHighestPriorityLane,
  getNextLanes,
  includesBlockingLane,
  includesExpiredLane,
  includesSomeLane,
  markRootFinished,
  markRootUpdated,
  markStarvedLanesAsExpired,
  mergeLanes,
  type Lane,
  type Lanes,
} from "./ReactFiberLane";
import type { FiberRootNode } from "./ReactFiberRoot";
import {
  ContinuousEventPriority,
  DefaultEventPriority,
  DiscreteEventPriority,
  IdleEventPriority,
  getCurrentUpdatePriority,
  lanesToEventPriority,
  setCurrentUpdatePriority,
} from "./ReactEventPriorities";
import { ConcurrentMode, NoMode } from "./ReactTypeOfMode";
import { scheduleMicrotask } from "./ReactFiberConfig";
import {
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_UserBlockingPriority,
  unstable_cancelCallback,
  unstable_now,
  unstable_scheduleCallback,
  unstable_shouldYield,
} from "scheduler";

// 对照官方 ReactFiberWorkLoop.new.js 的 import 别名：scheduler 的 unstable_* 导出在这里改名，
// reconciler 内部不直接暴露 unstable 前缀。
const ImmediatePriority = unstable_ImmediatePriority;
const UserBlockingPriority = unstable_UserBlockingPriority;
const NormalPriority = unstable_NormalPriority;
const IdlePriority = unstable_IdlePriority;
const scheduleCallback = unstable_scheduleCallback;
const cancelCallback = unstable_cancelCallback;
const now = unstable_now;
const shouldYield = unstable_shouldYield;

// ExecutionContext 位掩码：标记当前处于批量/渲染/提交阶段。官方还有 EventContext（事件系统，
// Phase 6）与 RetryAfterError（错误边界重试，Phase 9），这里先补 BatchedContext 供 flushSync
// 与批量更新使用，0b001 位是 Phase 2/3 起就为它预留的。
const NoContext = 0b000;
const BatchedContext = 0b001;
const RenderContext = 0b010;
const CommitContext = 0b100;

// 根节点的渲染退出状态。数值与官方一致；RootErrored/RootSuspended 等错误与挂起相关的
// 退出状态等到错误边界 / Suspense（Phase 9）落地时再补，Phase 4 只用到 InProgress/Completed。
const RootInProgress = 0;
const RootCompleted = 5;

// 当前正在处理的 fiber 树根 / 当前处理到的 fiber / 本次渲染的 lanes
let workInProgressRoot: FiberRootNode | null = null;
let workInProgress: FiberNode | null = null;
let workInProgressRootRenderLanes: Lanes = NoLanes;
let workInProgressRootExitStatus = RootInProgress;
// 本次渲染中被跳过（优先级不足）的 lanes，processUpdateQueue 跳过低优先级 update 时累积到这里
let workInProgressRootSkippedLanes: Lanes = NoLanes;

// 最近一次 update 的事件时间（requestEventTime 在批处理内复用同一时间戳）
let currentEventTime: number = NoTimestamp;

let executionContext: number = NoContext;

// 同步任务队列：SyncLane 的 performSyncWorkOnRoot 先进这个队列，由微任务统一 flush
let syncQueue: Array<() => any> | null = null;
let isFlushingSyncQueue = false;

export function getExecutionContext(): number {
  return executionContext;
}

// 对照官方 requestEventTime：渲染/提交阶段内直接取真实时间；同一批事件内的多次 update
// 复用同一个 eventTime（currentEventTime），直到再次进入 React 才重新计算。
export function requestEventTime(): number {
  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    return now();
  }
  if (currentEventTime !== NoTimestamp) {
    return currentEventTime;
  }
  currentEventTime = now();
  return currentEventTime;
}

// 对照官方 requestUpdateLane：非并发根（legacy render）恒返回 SyncLane；并发根优先取
// flushSync 设置的 DiscreteEventPriority，否则取事件系统的 currentUpdatePriority。事件系统
// Phase 6 才落地，这里普通 createRoot().render() 的兜底优先级是 DefaultLane。
export function requestUpdateLane(fiber: FiberNode): Lane {
  const mode = fiber.mode;
  if ((mode & ConcurrentMode) === NoMode) {
    return SyncLane;
  }
  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLane) {
    return updateLane;
  }
  // 对照官方最后会问宿主 getCurrentEventPriority，本项目无事件系统，先固定 DefaultLane
  return DefaultLane;
}

// 对照官方 prepareFreshStack：重置 root 的 finished 状态，并把 root.current 克隆成新的
// workInProgress 树根。若上一次并发渲染被中断（workInProgress 非空），官方会 unwind 中断的
// 子树；本项目无 context 栈/hooks，直接丢弃半成品即可。
function prepareFreshStack(root: FiberRootNode, lanes: Lanes): FiberNode {
  root.finishedWork = null;
  root.finishedLanes = NoLanes;

  if (workInProgress !== null) {
    // 上一次渲染被抢占，丢弃中断的 workInProgress
    workInProgress = null;
  }

  workInProgressRoot = root;
  const rootWorkInProgress = createWorkInProgress(root.current, null);
  workInProgress = rootWorkInProgress;
  workInProgressRootRenderLanes = lanes;
  workInProgressRootExitStatus = RootInProgress;
  workInProgressRootSkippedLanes = NoLanes;

  return rootWorkInProgress;
}

// 对照官方 workLoopSync：同步模式不检查 shouldYield，一口气处理完整棵树。
function workLoopSync(): void {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// 对照官方 workLoopConcurrent：每次处理一个 Fiber 后检查 shouldYield，时间片用完就中断，
// 把剩余工作留给下一段（performConcurrentWorkOnRoot 被 Scheduler 再次调度时续跑）。
function workLoopConcurrent(): void {
  while (workInProgress !== null && !shouldYield()) {
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
// 同步渲染必须完成整棵树，workInProgress 非空说明出了 bug。
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

// 对照官方 renderRootConcurrent：与 renderRootSync 的区别在于跑 workLoopConcurrent，
// 中断时（workInProgress 非空）返回 RootInProgress 且保留 workInProgressRoot/renderLanes，
// 供下一段从中断点续跑；只有整棵树完成才清空 root 指针并返回最终退出状态。
function renderRootConcurrent(root: FiberRootNode, lanes: Lanes): number {
  const prevExecutionContext = executionContext;
  executionContext |= RenderContext;

  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }

  workLoopConcurrent();

  executionContext = prevExecutionContext;

  if (workInProgress !== null) {
    // 还有剩余工作，被 shouldYield 中断，返回 RootInProgress
    return RootInProgress;
  }

  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;

  return workInProgressRootExitStatus;
}

// 对照官方 commitRootImpl（精简为只有 mutation 子阶段）：提交 finishedWork，应用所有 DOM
// 变更后交换 current 指针。pendingLanes 不再全量清零，而是只清掉本次 commit 掉的 lane、
// 保留被跳过的低优先级 lane（markRootFinished），提交后再 ensureRootIsScheduled 处理剩余工作。
function commitRootImpl(root: FiberRootNode): void {
  const finishedWork = root.finishedWork;
  if (finishedWork === null) {
    return;
  }

  const lanes = root.finishedLanes;
  root.finishedWork = null;
  root.finishedLanes = NoLanes;
  root.callbackNode = null;
  root.callbackPriority = NoLane;

  // 只把本次真正提交掉的 lane 从 pendingLanes 里清掉，剩余的（被跳过的低优先级 lane）
  // 保留下来，供 ensureRootIsScheduled 继续调度（对应 4.5 的 base 重放链路）
  const remainingLanes = mergeLanes(
    finishedWork.lanes,
    finishedWork.childLanes,
  );
  markRootFinished(root, remainingLanes);

  const prevExecutionContext = executionContext;
  executionContext |= CommitContext;

  // mutation 子阶段：插入/更新/删除 DOM（before-mutation / layout 子阶段留到后续）
  commitMutationEffects(root, finishedWork, lanes);

  // 双缓存树交换：workInProgress 树提交后成为新的 current 树
  root.current = finishedWork;

  executionContext = prevExecutionContext;

  // 有剩余工作（被跳过的 lane）则重新调度
  ensureRootIsScheduled(root, now());
}

function commitRoot(root: FiberRootNode): void {
  commitRootImpl(root);
}

// 对照官方 performConcurrentWorkOnRoot：所有走 Scheduler 的任务入口。按 lanes 决定是时间
// 切片（renderRootConcurrent）还是同步跑完（renderRootSync），树完成后提交。若本次任务节点
// 未被更高优先级替换，返回续跑函数让 Scheduler 下一段继续。
function performConcurrentWorkOnRoot(
  root: FiberRootNode,
  didTimeout: boolean,
): any {
  // 进入新的并发工作循环，重置事件时间
  currentEventTime = NoTimestamp;

  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    throw new Error("Should not already be working.");
  }

  const originalCallbackNode = root.callbackNode;

  const lanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
  );
  if (lanes === NoLanes) {
    // 没有可做的并发工作（防御性分支）
    return null;
  }

  // 阻塞 lane / 已过期 lane / Scheduler 超时（didTimeout）时不再时间切片，同步跑完防饥饿
  const shouldTimeSlice =
    !includesBlockingLane(root, lanes) &&
    !includesExpiredLane(root, lanes) &&
    !didTimeout;

  const exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);

  if (exitStatus !== RootInProgress) {
    // 树构建完成（RootCompleted）。错误/挂起的退出状态留到 Phase 9 再处理。
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(root);
  }

  ensureRootIsScheduled(root, now());
  if (root.callbackNode === originalCallbackNode) {
    // 任务还是当前这个（未被更高优先级替换），返回续跑函数继续下一段
    return performConcurrentWorkOnRoot.bind(null, root);
  }
  return null;
}

// 对照官方 performSyncWorkOnRoot：同步任务入口（不经过 Scheduler），取含 SyncLane 的
// lanes 同步渲染并提交，最后 ensureRootIsScheduled 处理剩余低优先级工作。
function performSyncWorkOnRoot(root: FiberRootNode): null {
  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    throw new Error("Should not already be working.");
  }

  const lanes = getNextLanes(root, NoLanes);
  if (!includesSomeLane(lanes, SyncLane)) {
    // 没有剩余同步工作
    ensureRootIsScheduled(root, now());
    return null;
  }

  const exitStatus = renderRootSync(root, lanes);

  if (exitStatus === RootCompleted) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(root);
  }

  ensureRootIsScheduled(root, now());

  return null;
}

// 对照官方 ensureRootIsScheduled：按 pendingLanes 的最高优先级决定调度方式。SyncLane 走
// 内部同步队列（微任务 flush），其余 lane 交给 Scheduler 分片执行；优先级没变则复用现有任务。
function ensureRootIsScheduled(root: FiberRootNode, currentTime: number): void {
  const existingCallbackNode = root.callbackNode;

  // 先做饥饿检测：过期 lane 并入 expiredLanes
  markStarvedLanesAsExpired(root, currentTime);

  const nextLanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
  );

  if (nextLanes === NoLanes) {
    // 没有可做的工作
    if (existingCallbackNode !== null) {
      cancelCallback(existingCallbackNode);
    }
    root.callbackNode = null;
    root.callbackPriority = NoLane;
    return;
  }

  const newCallbackPriority = getHighestPriorityLane(nextLanes);

  const existingCallbackPriority = root.callbackPriority;
  if (existingCallbackPriority === newCallbackPriority) {
    // 优先级没变，复用现有调度任务
    return;
  }

  if (existingCallbackNode != null) {
    // 取消旧任务，下面重新调度一个
    cancelCallback(existingCallbackNode);
  }

  let newCallbackNode;
  if (newCallbackPriority === SyncLane) {
    // SyncLane 走内部同步队列：performSyncWorkOnRoot 进队列，微任务统一 flush
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    scheduleMicrotask(flushSyncCallbacks);
    newCallbackNode = null;
  } else {
    let schedulerPriorityLevel;
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediatePriority;
        break;
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingPriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalPriority;
        break;
      case IdleEventPriority:
        schedulerPriorityLevel = IdlePriority;
        break;
      default:
        schedulerPriorityLevel = NormalPriority;
        break;
    }
    newCallbackNode = scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
    );
  }

  root.callbackPriority = newCallbackPriority;
  root.callbackNode = newCallbackNode;
}

// 对照官方 scheduleSyncCallback / flushSyncCallbacks：SyncLane 的同步任务先入队列，由微任务
// 在 BatchedContext 下统一 flush，保证同一批同步更新只 commit 一次。
export function scheduleSyncCallback(callback: () => any): void {
  if (syncQueue === null) {
    syncQueue = [callback];
  } else {
    syncQueue.push(callback);
  }
}

export function flushSyncCallbacks(): void {
  if (!isFlushingSyncQueue && syncQueue !== null) {
    isFlushingSyncQueue = true;
    let i = 0;
    const prevExecutionContext = executionContext;
    executionContext |= BatchedContext;
    try {
      for (; i < syncQueue.length; i++) {
        let callback = syncQueue[i];
        do {
          callback = callback();
        } while (callback !== null);
      }
      syncQueue = null;
    } finally {
      executionContext = prevExecutionContext;
      isFlushingSyncQueue = false;
    }
  }
}

// 对照官方 flushSync：在 BatchedContext 下以 DiscreteEventPriority 执行 fn，期间的更新都被
// 标记为同步优先级，结束后统一 flush 同步队列。
export function flushSync<A, R>(fn: (a: A) => R): R {
  const prevExecutionContext = executionContext;
  executionContext |= BatchedContext;

  const previousPriority = getCurrentUpdatePriority();
  try {
    setCurrentUpdatePriority(DiscreteEventPriority);
    if (fn) {
      return fn(null as unknown as A);
    }
    return undefined as unknown as R;
  } finally {
    setCurrentUpdatePriority(previousPriority);
    executionContext = prevExecutionContext;
    if (syncQueue !== null) {
      flushSyncCallbacks();
    }
  }
}

// 对照官方 scheduleUpdateOnFiber：把 lane 标记到 root.pendingLanes（markRootUpdated），
// 然后 ensureRootIsScheduled 决定同步 flush 还是交给 Scheduler。官方这里还有 render 阶段更新、
// act 警告等分支（Phase 6/9），本项目 updateContainer 是唯一入口、恒在渲染/提交之外触发。
export function scheduleUpdateOnFiber(
  root: FiberRootNode,
  _fiber: FiberNode,
  lane: Lane,
  eventTime: number,
): void {
  markRootUpdated(root, lane, eventTime);
  ensureRootIsScheduled(root, eventTime);
}

// 对照官方 markSkippedUpdateLanes：记录本次渲染中被跳过的 lanes。processUpdateQueue
// 在按 renderLanes 跳过低优先级 update 时调用，写回 workInProgressRootSkippedLanes。
export function markSkippedUpdateLanes(lanes: Lanes): void {
  workInProgressRootSkippedLanes = mergeLanes(
    workInProgressRootSkippedLanes,
    lanes,
  );
}

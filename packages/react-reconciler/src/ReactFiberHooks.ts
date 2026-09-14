/**
 * @file Hooks 实现（Hook 链表 + Dispatcher 切换 + useState/useReducer）
 * @description 对照官方 packages/react-reconciler/src/ReactFiberHooks.new.js 的核心子集：
 * Hook 以链表形式挂在 fiber.memoizedState 上，renderWithHooks 在函数组件渲染前根据
 * mount/update 切换 ReactCurrentDispatcher.current，组件体内调用的 useState/useReducer
 * 通过这个 dispatcher 找到对应的 mountXxx/updateXxx 实现。
 * 当前落地 useState/useReducer/useRef/useMemo/useCallback/useEffect/useLayoutEffect；
 * eagerState dispatch 侧优化见 Phase 9.4，均按官方结构逐步补齐。
 */

import ReactSharedInternals from "shared/ReactSharedInternals";
import is from "shared/objectIs";

import type { FiberNode } from "./ReactFiber";
import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
} from "./ReactFiberFlags";
import {
  NoLanes,
  isSubsetOfLanes,
  mergeLanes,
  NoLane,
  type Lane,
  type Lanes,
} from "./ReactFiberLane";
import { markWorkInProgressReceivedUpdate } from "./ReactFiberBeginWork";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import {
  HasEffect as HookHasEffect,
  Layout as HookLayout,
  Passive as HookPassive,
  type HookFlags,
} from "./ReactHookEffectTags";
import {
  markSkippedUpdateLanes,
  requestEventTime,
  requestUpdateLane,
  scheduleUpdateOnFiber,
} from "./ReactFiberWorkLoop";

const ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;

type BasicStateAction<S> = ((prevState: S) => S) | S;
type Dispatch<A> = (action: A) => void;

export interface Update<S, A> {
  lane: Lane;
  action: A;
  next: Update<S, A>;
}

export interface UpdateQueue<S, A> {
  pending: Update<S, A> | null;
  dispatch: Dispatch<A> | null;
  lastRenderedReducer: ((state: S, action: A) => S) | null;
  lastRenderedState: S | null;
}

export interface Hook {
  memoizedState: any;
  baseState: any;
  baseQueue: Update<any, any> | null;
  queue: UpdateQueue<any, any> | null;
  next: Hook | null;
}

// 本次渲染的 lanes / 正在渲染的 fiber（渲染前由 renderWithHooks 设置，渲染结束清空）
let renderLanes: Lanes = NoLanes;
let currentlyRenderingFiber: FiberNode = null as any;

// current 树的 hook 链表指针 / workInProgress 树正在构建的 hook 链表指针
let currentHook: Hook | null = null;
let workInProgressHook: Hook | null = null;

// 对照官方 basicStateReducer：useState 是 useReducer 的特例，action 是函数则调用（reducer 形式），
// 否则直接作为新 state（对象/基础类型形式）
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  return typeof action === "function"
    ? (action as (prevState: S) => S)(state)
    : action;
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };

  if (workInProgressHook === null) {
    // 链表第一个 hook，挂到 fiber.memoizedState
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

// 对照官方 updateWorkInProgressHook：按调用顺序把 workInProgress 的 hook 链表与 current 的
// hook 链表一一对应地往前走一格。链表顺序即调用顺序，这也是"不能在条件语句里调 hook"的原因——
// 顺序错位就会读到错误的 hook 状态。
function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null;
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    nextCurrentHook = current !== null ? current.memoizedState : null;
  } else {
    nextCurrentHook = currentHook.next;
  }

  let nextWorkInProgressHook: Hook | null;
  if (workInProgressHook === null) {
    nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
  } else {
    nextWorkInProgressHook = workInProgressHook.next;
  }

  if (nextWorkInProgressHook !== null) {
    // 重入（如渲染中途重新进入同一函数组件的多次调用），复用已构建的 hook
    workInProgressHook = nextWorkInProgressHook;
    currentHook = nextCurrentHook;
  } else {
    // 正常路径：从 current 克隆一个新 hook 节点
    if (nextCurrentHook === null) {
      throw new Error("Rendered more hooks than during the previous render.");
    }
    currentHook = nextCurrentHook;

    const newHook: Hook = {
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,
      next: null,
    };

    if (workInProgressHook === null) {
      currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else {
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }
  return workInProgressHook;
}

function mountState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  const hook = mountWorkInProgressHook();
  if (typeof initialState === "function") {
    initialState = (initialState as () => S)();
  }
  hook.memoizedState = hook.baseState = initialState;

  const queue: UpdateQueue<S, BasicStateAction<S>> = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;

  // bind 对泛型函数的类型推导有已知局限（TS 会把 S/A 实例化成 unknown 再检查），
  // 官方源码在这里同样绕不开、直接 as any 兜底
  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue as any,
  ) as Dispatch<BasicStateAction<S>>);

  return [hook.memoizedState, dispatch];
}

function updateState<S>(
  _initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer);
}

function mountReducer<S, I, A>(
  reducer: (state: S, action: A) => S,
  initialArg: I,
  init?: (arg: I) => S,
): [S, Dispatch<A>] {
  const hook = mountWorkInProgressHook();
  const initialState =
    init !== undefined ? init(initialArg) : (initialArg as unknown as S);
  hook.memoizedState = hook.baseState = initialState;

  const queue: UpdateQueue<S, A> = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;

  const dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue as any,
  ) as Dispatch<A>);

  return [hook.memoizedState, dispatch];
}

// 对照官方 updateReducer/updateReducerImpl：把 pending 循环链表解环、并入 baseQueue，
// 按 renderLanes 逐条重放——优先级不足的 update 被跳过并保留在新的 baseQueue 里
// （baseState 停在第一条被跳过的 update 之前），供下次高优先级渲染完成后重放，
// 与 ReactFiberClassUpdateQueue.processUpdateQueue 的跳过/重放逻辑同源。
function updateReducer<S, A>(
  reducer: (state: S, action: A) => S,
): [S, Dispatch<A>] {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue as UpdateQueue<S, A> | null;
  if (queue === null) {
    throw new Error(
      "Should have a queue. You are likely calling Hooks conditionally, which is not allowed.",
    );
  }

  queue.lastRenderedReducer = reducer;

  let baseQueue = hook.baseQueue as Update<S, A> | null;
  const pendingQueue = queue.pending;
  if (pendingQueue !== null) {
    // 把本次渲染前新收到的 pending update 并入 baseQueue
    if (baseQueue !== null) {
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    baseQueue = pendingQueue;
    hook.baseQueue = baseQueue;
    queue.pending = null;
  }

  if (baseQueue !== null) {
    const first = baseQueue.next;
    let newState = hook.baseState;

    let newBaseState: S | null = null;
    let newBaseQueueFirst: Update<S, A> | null = null;
    let newBaseQueueLast: Update<S, A> | null = null;
    let update: Update<S, A> = first;

    do {
      const updateLane = update.lane;
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // 优先级不足：跳过，克隆进新的 baseQueue 留待后续高优先级渲染重放
        const clone: Update<S, A> = {
          lane: updateLane,
          action: update.action,
          next: null as any,
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = clone;
          newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane,
        );
        markSkippedUpdateLanes(updateLane);
      } else {
        // 优先级足够：处理该 update。若之前已经跳过过 update，本条也要克隆进 baseQueue
        // （lane 置 NoLane，保证重放时恒被消费）
        if (newBaseQueueLast !== null) {
          const clone: Update<S, A> = {
            lane: NoLane,
            action: update.action,
            next: null as any,
          };
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }
        newState = reducer(newState, update.action);
      }
      update = update.next;
    } while (update !== null && update !== first);

    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst as Update<S, A>;
    }

    if (!is(newState, hook.memoizedState)) {
      markWorkInProgressReceivedUpdate();
    }

    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = newState;
  }

  const dispatch = queue.dispatch as Dispatch<A>;
  return [hook.memoizedState, dispatch];
}

// 对照官方 mountRef：ref 对象只在 mount 时创建一次，之后每次渲染 updateRef 都原样返回，
// 不依赖 deps 比较——这也是 useRef 天然“跨渲染保持同一个引用”的由来。
function mountRef<T>(initialValue: T): { current: T } {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}

function updateRef<T>(_initialValue: T): { current: T } {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

// 对照官方 areHookInputsEqual：逐项用 Object.is 比较新旧 deps，长度不同以官方实现为准——
// 不做额外校验（deps 数组长度变化本身就是误用），依赖数组为 null/undefined 视为每次都要重算。
function areHookInputsEqual(
  nextDeps: unknown[] | null,
  prevDeps: unknown[] | null,
): boolean {
  if (prevDeps === null) {
    return false;
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps!.length; i++) {
    if (is(nextDeps![i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

function mountMemo<T>(nextCreate: () => T, deps: unknown[] | void | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function updateMemo<T>(nextCreate: () => T, deps: unknown[] | void | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (nextDeps !== null) {
    const prevDeps: unknown[] | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

// 对照官方 mountCallback/updateCallback：useCallback 是 useMemo 的特例——缓存的是函数本身
// 而不是调用结果，所以不像 mountMemo 那样立刻执行 create。
function mountCallback<T>(callback: T, deps: unknown[] | void | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function updateCallback<T>(callback: T, deps: unknown[] | void | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (nextDeps !== null) {
    const prevDeps: unknown[] | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

// 对照官方 Effect：单个副作用节点，create/destroy 是用户传入的函数，tag 标记 effect 类型
// （Layout/Passive）与本次渲染是否需要执行（HasEffect，由 deps 是否变化决定）。多个 effect
// 按调用顺序串成一个循环链表（不是 Hook 链表，而是挂在 fiber.updateQueue 上的独立链表——
// 这样 commit 阶段可以只遍历 effect，不用重新走一遍 Hook 链表）。
export interface Effect {
  tag: HookFlags;
  create: () => (() => void) | void;
  destroy: (() => void) | void;
  deps: unknown[] | null;
  next: Effect;
}

export interface FunctionComponentUpdateQueue {
  lastEffect: Effect | null;
}

// 对照官方 pushEffect：把新 effect 接到 circular list 尾部（lastEffect.next 始终指向头部）。
function pushEffect(
  tag: HookFlags,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: unknown[] | null,
): Effect {
  const effect: Effect = {
    tag,
    create,
    destroy,
    deps,
    next: null as any,
  };
  let componentUpdateQueue: FunctionComponentUpdateQueue | null =
    currentlyRenderingFiber.updateQueue;
  if (componentUpdateQueue === null) {
    componentUpdateQueue = { lastEffect: null };
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}

// 对照官方 mountEffectImpl：mount 时无论 deps 是什么，一定要执行一次 create，所以恒打
// HookHasEffect；fiberFlags（Update/Passive）标记到 fiber 上，供 commit 阶段的
// LayoutMask/PassiveMask 剪枝判断这棵子树要不要走 layout/passive 遍历。
function mountEffectImpl(
  fiberFlags: number,
  hookFlags: HookFlags,
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    hookFlags | HookHasEffect,
    create,
    undefined,
    nextDeps,
  );
}

// 对照官方 updateEffectImpl：deps 不变时复用上一次的 destroy、不打 HookHasEffect（commit
// 阶段据此跳过这个 effect，达到"deps 不变就不重新执行"的效果）；deps 变化才重新打标记。
function updateEffectImpl(
  fiberFlags: number,
  hookFlags: HookFlags,
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevEffect: Effect = hook.memoizedState;
  const destroy = prevEffect.destroy;

  if (nextDeps !== null) {
    const prevDeps = prevEffect.deps;
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
      return;
    }
  }

  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    hookFlags | HookHasEffect,
    create,
    destroy,
    nextDeps,
  );
}

function mountEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function updateEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function mountLayoutEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  mountEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function updateLayoutEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}

// dispatchSetState/dispatchReducerAction 逻辑相同（本项目暂不做 eagerState 优化，见 Phase 9.4），
// 保留两个名字只是对照官方两套 hook 各自的 dispatch 入口命名。
function enqueueHookUpdate<S, A>(
  fiber: FiberNode,
  queue: UpdateQueue<S, A>,
  action: A,
  lane: Lane,
): void {
  const update: Update<S, A> = {
    lane,
    action,
    next: null as any,
  };
  const eventTime = requestEventTime();
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  if (root !== null) {
    scheduleUpdateOnFiber(root, fiber, lane, eventTime);
  }
}

function dispatchSetState<S, A>(
  fiber: FiberNode,
  queue: UpdateQueue<S, A>,
  action: A,
): void {
  const lane = requestUpdateLane(fiber);
  enqueueHookUpdate(fiber, queue, action, lane);
}

function dispatchReducerAction<S, A>(
  fiber: FiberNode,
  queue: UpdateQueue<S, A>,
  action: A,
): void {
  const lane = requestUpdateLane(fiber);
  enqueueHookUpdate(fiber, queue, action, lane);
}

// 渲染阶段外调用 hook（不合法调用）统一走这个 dispatcher，行为是直接抛错
function throwInvalidHookError(): never {
  throw new Error(
    "Invalid hook call. Hooks can only be called inside of the body of a function component.",
  );
}

const ContextOnlyDispatcher = {
  useState: throwInvalidHookError,
  useReducer: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useCallback: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useLayoutEffect: throwInvalidHookError,
};

const HooksDispatcherOnMount = {
  useState: mountState,
  useReducer: mountReducer,
  useRef: mountRef,
  useMemo: mountMemo,
  useCallback: mountCallback,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
};

const HooksDispatcherOnUpdate = {
  useState: updateState,
  useReducer: updateReducer,
  useRef: updateRef,
  useMemo: updateMemo,
  useCallback: updateCallback,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
};

// 对照官方 renderWithHooks：渲染前重置 hook 相关模块状态、按 mount/update 切换 dispatcher，
// 渲染后把 dispatcher 恢复成 ContextOnlyDispatcher（渲染阶段外调用 hook 会立即报错）。
export function renderWithHooks<Props>(
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: (props: Props) => any,
  props: Props,
  nextRenderLanes: Lanes,
): any {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;

  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;

  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;

  const children = Component(props);

  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

  renderLanes = NoLanes;
  currentlyRenderingFiber = null as any;
  currentHook = null;
  workInProgressHook = null;

  return children;
}

/**
 * @file React Hooks 入口
 * @description useState/useReducer 等对外 API，只做参数转发，真正实现在当前 Dispatcher 上
 */

import type { ReactContext } from "shared/ReactTypes";

import ReactCurrentDispatcher from "./ReactCurrentDispatcher";

// 对照官方 packages/react/src/ReactHooks.js：react 包本身不实现 hook 逻辑，只是从
// ReactCurrentDispatcher.current 上取出当前渲染器安装的 Dispatcher（reconciler 的
// HooksDispatcherOnMount/OnUpdate），再转发调用。resolveDispatcher 是唯一的校验点——
// dispatcher 为 null 说明这次调用不在函数组件渲染期间（违反 Hooks 规则）。
function resolveDispatcher(): any {
  const dispatcher = ReactCurrentDispatcher.current;
  if (__DEV__) {
    if (dispatcher === null) {
      console.error(
        "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for" +
          " one of the following reasons:\n" +
          "1. You might have mismatching versions of React and the renderer (such as React DOM)\n" +
          "2. You might be breaking the Rules of Hooks\n" +
          "3. You might have more than one copy of React in the same app",
      );
    }
  }
  return dispatcher;
}

/**
 * useState() - 用一个 state 变量管理组件内部状态
 * @param initialState - 初始 state，或返回初始 state 的惰性初始化函数
 * @returns [当前 state, 更新 state 的 dispatch 函数]
 */
export function useState<S>(
  initialState: (() => S) | S,
): [S, (action: ((prevState: S) => S) | S) => void] {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}

/**
 * useReducer() - 用 reducer 管理更复杂的组件内部状态
 * @param reducer - (state, action) => newState
 * @param initialArg - 初始 state，或传给 init 的参数
 * @param init - 惰性初始化函数（可选）
 * @returns [当前 state, dispatch 函数]
 */
export function useReducer<S, I, A>(
  reducer: (state: S, action: A) => S,
  initialArg: I,
  init?: (arg: I) => S,
): [S, (action: A) => void] {
  const dispatcher = resolveDispatcher();
  return dispatcher.useReducer(reducer, initialArg, init);
}

/**
 * useRef() - 创建一个跨渲染保持同一引用的可变对象
 * @param initialValue - ref 的初始值
 * @returns { current: T } 形状的可变对象
 */
export function useRef<T>(initialValue: T): { current: T } {
  const dispatcher = resolveDispatcher();
  return dispatcher.useRef(initialValue);
}

/**
 * useMemo() - 缓存一个计算结果，仅在依赖变化时重新计算
 * @param nextCreate - 计算函数
 * @param deps - 依赖数组，为 null/undefined 时每次渲染都重新计算
 */
export function useMemo<T>(
  nextCreate: () => T,
  deps: unknown[] | void | null,
): T {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMemo(nextCreate, deps);
}

/**
 * useCallback() - 缓存一个函数引用，仅在依赖变化时返回新的函数
 * @param callback - 待缓存的函数
 * @param deps - 依赖数组，为 null/undefined 时每次渲染都返回新引用
 */
export function useCallback<T>(callback: T, deps: unknown[] | void | null): T {
  const dispatcher = resolveDispatcher();
  return dispatcher.useCallback(callback, deps);
}

/**
 * useEffect() - 在 commit 后异步执行副作用（不阻塞浏览器绘制）
 * @param create - 副作用函数，可返回一个清理函数
 * @param deps - 依赖数组，为 null/undefined 时每次渲染都重新执行
 */
export function useEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
}

/**
 * useLayoutEffect() - 在 commit 阶段同步执行副作用（DOM 变更后、浏览器绘制前）
 * @param create - 副作用函数，可返回一个清理函数
 * @param deps - 依赖数组，为 null/undefined 时每次渲染都重新执行
 */
export function useLayoutEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher.useLayoutEffect(create, deps);
}

/**
 * useInsertionEffect() - 在 DOM 变更之前同步执行副作用，专为 CSS-in-JS 库插入 <style> 设计
 * @param create - 副作用函数，可返回一个清理函数
 * @param deps - 依赖数组，为 null/undefined 时每次渲染都重新执行
 */
export function useInsertionEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher.useInsertionEffect(create, deps);
}

/**
 * useTransition() - 把 callback 内触发的更新标记为过渡更新（TransitionLane），不阻塞紧急更新
 * @returns [isPending 是否有过渡更新正在进行, startTransition 触发过渡更新的函数]
 */
export function useTransition(): [boolean, (callback: () => void) => void] {
  const dispatcher = resolveDispatcher();
  return dispatcher.useTransition();
}

/**
 * useDeferredValue() - 返回一个延迟更新的值，紧急更新时先复用旧值，随后再单独渲染新值
 * @param value - 最新值
 */
export function useDeferredValue<T>(value: T): T {
  const dispatcher = resolveDispatcher();
  return dispatcher.useDeferredValue(value);
}

/**
 * useSyncExternalStore() - 订阅一个 React 外部的状态源，store 变化时强制同步重渲染
 * @param subscribe - 订阅函数，参数是"store 变化时调用"的回调，返回取消订阅函数
 * @param getSnapshot - 读取当前 store 快照的函数
 */
export function useSyncExternalStore<T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
): T {
  const dispatcher = resolveDispatcher();
  return dispatcher.useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * useContext() - 读取最近祖先 Provider 提供的 context 值，没有匹配的 Provider 时返回默认值
 * @param context - createContext() 创建的 Context 对象
 */
export function useContext<T>(context: ReactContext<T>): T {
  const dispatcher = resolveDispatcher();
  return dispatcher.useContext(context);
}

/**
 * useId() - 生成一个跨组件实例稳定、页面内唯一的字符串 id
 * 简化范围：本项目没有 hydrateRoot，只落地官方的客户端分支（模块级自增计数器），
 * 不做 treeContext 按组件树路径编码 id 那一套（该机制只为 SSR/CSR 一致性服务）
 */
export function useId(): string {
  const dispatcher = resolveDispatcher();
  return dispatcher.useId();
}

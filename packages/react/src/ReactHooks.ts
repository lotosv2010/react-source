/**
 * @file React Hooks 入口
 * @description useState/useReducer 等对外 API，只做参数转发，真正实现在当前 Dispatcher 上
 */

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

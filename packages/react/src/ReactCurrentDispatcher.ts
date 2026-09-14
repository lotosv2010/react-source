/**
 * @file React 当前 Hooks Dispatcher
 * @description 记录当前正在使用的 Hooks 实现集合（Mount/Update/ContextOnly），渲染阶段外为 null
 */

// 对照官方 packages/react/src/ReactCurrentDispatcher.js：Dispatcher 是一组 hook 实现
// （useState/useReducer 等）的集合，reconciler 的 renderWithHooks 在渲染前根据 mount/update
// 切换 current 指向哪一套，react 包的 useState/useReducer 等入口通过 current 拿到当前应调用的实现。
// 渲染阶段外 current 为 null，调用 hook 会触发 "Invalid hook call" 提示。
const ReactCurrentDispatcher: { current: any | null } = {
  current: null,
};

export default ReactCurrentDispatcher;

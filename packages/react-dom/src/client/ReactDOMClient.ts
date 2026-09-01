/**
 * @file react-dom 客户端入口（简版）
 * @description 只实现 createRoot（Concurrent 模式同步渲染），不含 legacy ReactDOM.render、
 * hydrateRoot 等。对照官方 ReactDOMClient.js：createRoot 内部先创建根容器（createContainer），
 * 再包一层 ReactDOMRoot 暴露 render 方法。
 */

import { createContainer } from "react-reconciler/src/ReactFiberReconciler";
import { ConcurrentRoot } from "react-reconciler/src/ReactRootTags";
import { setRootHostContainer } from "./ReactDOMHostConfig";
import { ReactDOMRoot } from "./ReactDOMRoot";

/**
 * 创建并发根（createRoot 的底层实现）
 * @param container - 宿主容器（DOM 元素）
 * @param _options - createRoot 选项（onRecoverableError 等），简版暂未消费
 * @returns ReactDOMRoot
 */
export function createRoot(
  container: Element,
  _options?: unknown,
): ReactDOMRoot {
  // 对照官方：先让 HostConfig 记下根容器（getRootHostContainer 返回它），
  // 再 createContainer 构造 HostRoot fiber。官方用 ConcurrentRoot 作为 createRoot 的根模式。
  setRootHostContainer(container);
  const root = createContainer(container, ConcurrentRoot);
  return new ReactDOMRoot(root);
}

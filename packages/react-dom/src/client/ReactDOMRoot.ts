/**
 * @file ReactDOMRoot（createRoot 的返回值）与 createRoot 实现
 * @description 包装 FiberRootNode，暴露 render 方法。对照官方 ReactDOMRoot.js：
 * createRoot 的真正实现和 ReactDOMRoot class 同属这一个文件；上层 ReactDOMClient.ts
 * 只做转出（官方那层还额外挂 findDOMNode/DevTools 注入等，本项目简版暂不需要）。
 * ReactDOMRoot.render 内部调用 updateContainer 把 ReactElement 挂到根 fiber 的更新队列。
 */

import {
  createContainer,
  updateContainer,
  type OpaqueRoot,
} from "react-reconciler/src/ReactFiberReconciler";
import { ConcurrentRoot } from "react-reconciler/src/ReactRootTags";
import {
  setRootHostContainer,
  type Container,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { listenToAllSupportedEvents } from "react-dom-bindings/src/events/DOMPluginEventSystem";

export interface RootType {
  render(children: any): void;
  _internalRoot: OpaqueRoot;
}

export class ReactDOMRoot implements RootType {
  _internalRoot: OpaqueRoot;

  constructor(root: OpaqueRoot) {
    this._internalRoot = root;
  }

  render(children: any): void {
    updateContainer(children, this._internalRoot);
  }
}

export interface RootOptions {
  identifierPrefix?: string;
}

/**
 * 创建并发根（createRoot 的底层实现）
 * @param container - 宿主容器（DOM 元素）
 * @param options - createRoot 选项（identifierPrefix 供 useId 使用，onRecoverableError 等未消费）
 * @returns ReactDOMRoot
 */
export function createRoot(
  container: Container,
  options?: RootOptions,
): RootType {
  // 对照官方：先让 HostConfig 记下根容器（getRootHostContainer 返回它），
  // 再 createContainer 构造 HostRoot fiber。官方用 ConcurrentRoot 作为 createRoot 的根模式。
  setRootHostContainer(container);
  const identifierPrefix = options?.identifierPrefix ?? "";
  const root = createContainer(container, ConcurrentRoot, identifierPrefix);
  // 事件委托：在根容器上一次性注册所有支持的原生事件监听器（capture+bubble），
  // 具体某个 DOM 节点是否真的挂了 onClick 等，交给事件分发时按需读取 props
  listenToAllSupportedEvents(container);
  return new ReactDOMRoot(root);
}

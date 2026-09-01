/**
 * @file ReactDOMRoot（createRoot 的返回值）
 * @description 包装 FiberRootNode，暴露 render 方法。对照官方 ReactDOMRoot.js：
 * ReactDOMRoot.render 内部调用 updateContainer 把 ReactElement 挂到根 fiber 的更新队列。
 */

import { updateContainer } from "react-reconciler/src/ReactFiberReconciler";
import type { FiberRootNode } from "react-reconciler/src/ReactFiberRoot";

export class ReactDOMRoot {
  _internalRoot: FiberRootNode;

  constructor(root: FiberRootNode) {
    this._internalRoot = root;
  }

  render(children: any): void {
    updateContainer(children, this._internalRoot);
  }
}

/**
 * @file createPortal
 * @description 对照官方 packages/react-reconciler/src/ReactPortal.js：Portal 本质是一个特殊的
 * ReactElement 变体（$$typeof 是 REACT_PORTAL_TYPE 而不是 REACT_ELEMENT_TYPE），携带
 * containerInfo 告诉 reconciler 这棵子树的真实 DOM 应该挂到哪个容器，而不是当前 fiber 树的
 * 宿主父节点；但组件树的逻辑父级仍是调用处（context/生命周期沿 Fiber 树而非真实 DOM 树传播）。
 * 放在 reconciler 包（而不是 react 包）是因为 createFiberFromPortal（ReactFiber.ts）需要
 * 消费这个类型，对照官方两者同属 reconciler；react-dom 只做参数转发对外暴露。
 */

import { REACT_PORTAL_TYPE } from "shared/ReactSymbols";
import type { Key } from "shared/ReactTypes";

export interface ReactPortalType {
  $$typeof: symbol;
  key: Key;
  children: any;
  containerInfo: any;
  implementation: any;
}

/**
 * createPortal(children, containerInfo, key?) - 把 children 渡染到 containerInfo 这个
 * 真实 DOM 容器下，但组件树的逻辑父级仍是调用处
 */
export function createPortal(
  children: any,
  containerInfo: any,
  key: string | null = null,
): ReactPortalType {
  return {
    $$typeof: REACT_PORTAL_TYPE,
    key: key == null ? null : "" + key,
    children,
    containerInfo,
    // 跨渲染器实现的占位字段，本项目只有 react-dom 一个渲染器，恒为 null
    implementation: null,
  };
}

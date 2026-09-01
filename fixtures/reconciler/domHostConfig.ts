/**
 * @file 手写 DOM HostConfig（仅用于 fixtures 调试）
 * @description react-dom 尚未搭建（Phase 2），reconciler 的 HostConfig 还没有真实渲染器注入。
 * 这里手写一份最小 DOM 实现，只覆盖同步主链路（挂载/更新/删除）用得到的方法子集，
 * 用来在 fixtures 里验证 reconciler 能真实操作 DOM。等 react-dom 落地后，这份配置
 * 由 packages/react-dom 里的正式实现（DOMPropertyOperations 等）取代。
 */

import type { HostConfig } from "react-reconciler";

// 属性设置/对比只覆盖演示用得到的子集（className/style/普通字符串属性），
// 不是 react-dom DOMPropertyOperations 的完整还原（事件、dangerouslySetInnerHTML、
// 布尔属性等留到对应 Phase 再补）。事件处理器（on*）直接忽略——事件系统 Phase 6 才落地。

/** 设置单个属性到 DOM 元素 */
function setProp(domElement: HTMLElement, propKey: string, value: any): void {
  if (typeof value === "function") {
    // 事件处理器（onClick 等）：事件系统尚未实现，fixtures 里先忽略
    return;
  }
  if (propKey === "style" && typeof value === "object" && value !== null) {
    const style = domElement.style;
    for (const styleName in value) {
      style.setProperty(styleName, value[styleName]);
    }
    return;
  }
  if (propKey === "className") {
    domElement.className = value == null ? "" : String(value);
    return;
  }
  if (value == null) {
    domElement.removeAttribute(propKey);
    return;
  }
  domElement.setAttribute(propKey, String(value));
}

/** 挂载时设置初始属性（跳过 children，children 由 HostText fiber 单独 append） */
function setInitialProperties(
  domElement: HTMLElement,
  props: Record<string, any>,
): void {
  for (const propKey in props) {
    if (propKey === "children") {
      continue;
    }
    setProp(domElement, propKey, props[propKey]);
  }
}

/** 对比新旧 props，产出 [key1, value1, key2, value2, ...] 的扁平 updatePayload */
function diffProperties(
  lastProps: Record<string, any>,
  nextProps: Record<string, any>,
): any[] | null {
  const updatePayload: any[] = [];

  const propKeySet: Set<string> = new Set();
  for (const propKey in lastProps) {
    propKeySet.add(propKey);
  }
  for (const propKey in nextProps) {
    propKeySet.add(propKey);
  }

  for (const propKey of propKeySet) {
    if (propKey === "children") {
      continue;
    }
    const lastValue = lastProps[propKey];
    const nextValue = nextProps[propKey];
    if (lastValue === nextValue) {
      continue;
    }
    if (typeof nextValue === "function") {
      // 事件处理器变化忽略（事件系统未实现）
      continue;
    }
    updatePayload.push(propKey, nextValue);
  }

  return updatePayload.length > 0 ? updatePayload : null;
}

// 根容器由 fixtures 在 createContainer 前注入，getRootHostContainer 返回它。
// createInstance/createTextInstance 实际不消费这个参数（DOM 渲染器里 rootContainerInstance
// 用于取 ownerDocument），这里仅作占位返回。
let rootContainer: any = document.documentElement;

/** 设置根容器（fixtures 调用） */
export function setRootHostContainer(container: any): void {
  rootContainer = container;
}

/** 手写的 DOM HostConfig 实现 */
export const domHostConfig: HostConfig = {
  supportsMutation: true,
  supportsPersistence: false,

  createInstance(type, props) {
    const domElement = document.createElement(type);
    setInitialProperties(domElement, props);
    return domElement;
  },

  createTextInstance(text) {
    return document.createTextNode(text);
  },

  appendInitialChild(parentInstance, child) {
    parentInstance.appendChild(child);
  },

  finalizeInitialChildren() {
    // DOM 渲染器在这里返回 shouldAutoFocusHostComponent（autofocus 等初始副作用），
    // fixtures 演示不需要，恒返回 false
    return false;
  },

  prepareUpdate(_instance, _type, oldProps, newProps) {
    return diffProperties(oldProps, newProps);
  },

  commitUpdate(instance, updatePayload) {
    for (let i = 0; i < updatePayload.length; i += 2) {
      const propKey = updatePayload[i];
      const propValue = updatePayload[i + 1];
      setProp(instance, propKey, propValue);
    }
  },

  commitTextUpdate(textInstance, _oldText, newText) {
    textInstance.nodeValue = newText;
  },

  appendChild(parentInstance, child) {
    parentInstance.appendChild(child);
  },

  appendChildToContainer(container, child) {
    container.appendChild(child);
  },

  insertBefore(parentInstance, child, beforeChild) {
    parentInstance.insertBefore(child, beforeChild);
  },

  insertInContainerBefore(container, child, beforeChild) {
    container.insertBefore(child, beforeChild);
  },

  removeChild(parentInstance, child) {
    parentInstance.removeChild(child);
  },

  removeChildFromContainer(container, child) {
    container.removeChild(child);
  },

  shouldSetTextContent() {
    // 直接文本子节点优化（textarea/option 等）留到 react-dom，fixtures 恒返回 false，
    // 字符串 children 走 HostText fiber 路径
    return false;
  },

  getRootHostContainer() {
    return rootContainer;
  },

  getHostContext() {
    // 本项目 host config 没有 context 栈（react-dom 落地时补 host context），返回空对象
    return {};
  },
};

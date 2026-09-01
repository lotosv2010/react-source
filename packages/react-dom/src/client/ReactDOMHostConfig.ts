/**
 * @file react-dom 的 DOM HostConfig 实现（简版）
 * @description reconciler 通过 HostConfig 与具体渲染器解耦，react-dom 构建时通过 fork
 * 把本模块注入 reconciler（替换掉只抛错的 ReactFiberHostConfig 占位模块）。这里只覆盖
 * 同步主链路（挂载/更新/删除）用得到的方法子集，属性处理只做 className/style/普通字符串
 * 属性的简版（事件 on* 暂忽略、dangerouslySetInnerHTML/布尔属性等 DOMPropertyOperations
 * 完整体系留到后续 Phase 再补）。
 */

// 属性设置/对比只覆盖主链路用得到的子集（className/style/普通字符串属性），
// 不是 react-dom DOMPropertyOperations 的完整还原（事件、dangerouslySetInnerHTML、
// 布尔属性等留到对应 Phase 再补）。事件处理器（on*）直接忽略——事件系统 Phase 6 才落地。

/** 设置单个属性到 DOM 元素 */
function setProp(domElement: Element, propKey: string, value: any): void {
  if (typeof value === "function") {
    // 事件处理器（onClick 等）：事件系统尚未实现，先忽略
    return;
  }
  if (propKey === "style" && typeof value === "object" && value !== null) {
    const style = (domElement as HTMLElement).style;
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
  domElement: Element,
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

// 根容器由 createRoot 在 createContainer 前注入，getRootHostContainer 返回它。
// createInstance/createTextInstance 通过 rootContainerInstance 取 ownerDocument
// （对照官方：rootContainerInstance 在 DOM 渲染器里用于创建元素时确定所属文档）。
let rootContainer: Element = document.documentElement;

/** 设置根容器（仅 ReactDOMClient.createRoot 内部调用，不进对外 API） */
export function setRootHostContainer(container: Element): void {
  rootContainer = container;
}

export const supportsMutation = true;
export const supportsPersistence = false;

export function createInstance(
  type: string,
  props: Record<string, any>,
  rootContainerInstance: Element,
  _hostContext: unknown,
  _internalInstanceHandle: unknown,
): Element {
  const ownerDocument = rootContainerInstance.ownerDocument || document;
  const domElement = ownerDocument.createElement(type);
  setInitialProperties(domElement, props);
  return domElement;
}

export function createTextInstance(
  text: string,
  rootContainerInstance: Element,
  _hostContext: unknown,
  _internalInstanceHandle: unknown,
): Text {
  const ownerDocument = rootContainerInstance.ownerDocument || document;
  return ownerDocument.createTextNode(text);
}

export function appendInitialChild(
  parentInstance: Element,
  child: Element | Text,
): void {
  parentInstance.appendChild(child);
}

export function finalizeInitialChildren(
  _instance: Element,
  _type: string,
  _props: Record<string, any>,
  _rootContainerInstance: Element,
  _hostContext: unknown,
): boolean {
  // DOM 渲染器在这里返回 shouldAutoFocusHostComponent（autofocus 等初始副作用），
  // 简版不需要，恒返回 false
  return false;
}

export function prepareUpdate(
  _instance: Element,
  _type: string,
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
  _rootContainerInstance: Element,
  _hostContext: unknown,
): any[] | null {
  return diffProperties(oldProps, newProps);
}

export function commitUpdate(
  instance: Element,
  updatePayload: any[],
  _type: string,
  _oldProps: Record<string, any>,
  _newProps: Record<string, any>,
  _internalInstanceHandle: unknown,
): void {
  for (let i = 0; i < updatePayload.length; i += 2) {
    const propKey = updatePayload[i];
    const propValue = updatePayload[i + 1];
    setProp(instance, propKey, propValue);
  }
}

export function commitTextUpdate(
  textInstance: Text,
  _oldText: string,
  newText: string,
): void {
  textInstance.nodeValue = newText;
}

export function appendChild(
  parentInstance: Element,
  child: Element | Text,
): void {
  parentInstance.appendChild(child);
}

export function appendChildToContainer(
  container: Element,
  child: Element | Text,
): void {
  container.appendChild(child);
}

export function insertBefore(
  parentInstance: Element,
  child: Element | Text,
  beforeChild: Element | Text,
): void {
  parentInstance.insertBefore(child, beforeChild);
}

export function insertInContainerBefore(
  container: Element,
  child: Element | Text,
  beforeChild: Element | Text,
): void {
  container.insertBefore(child, beforeChild);
}

export function removeChild(
  parentInstance: Element,
  child: Element | Text,
): void {
  parentInstance.removeChild(child);
}

export function removeChildFromContainer(
  container: Element,
  child: Element | Text,
): void {
  container.removeChild(child);
}

export function shouldSetTextContent(
  _type: string,
  _props: Record<string, any>,
): boolean {
  // 直接文本子节点优化（textarea/option 等）留到后续 Phase，简版恒返回 false，
  // 字符串 children 走 HostText fiber 路径
  return false;
}

export function getRootHostContainer(): Element {
  return rootContainer;
}

export function getHostContext(): object {
  // 本项目 host config 没有 context 栈（react-dom 落地 host context 时补），返回空对象
  return {};
}

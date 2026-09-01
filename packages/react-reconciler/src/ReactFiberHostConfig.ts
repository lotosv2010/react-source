/**
 * @file HostConfig（渲染器与平台无关接口的占位实现）
 * @description reconciler 通过这组接口与具体渲染器（如 react-dom）解耦。官方在本文件里直接
 * throw，真正的实现由各渲染器在构建时通过 fork 注入（forks/ReactFiberHostConfig.custom.js
 * 把 react-dom 的 ReactDOMHostConfig 替换进本模块）。本项目对齐官方：本文件每个导出都 throw，
 * 一旦 rollup 的 fork 配置失效、误用了这份兜底实现，会立刻报错而非静默出错。
 */

// 对照官方 packages/react-reconciler/src/ReactFiberHostConfig.js 里的 Flow 类型：
// 泛型 renderer 的 Instance/TextInstance/Container/Props/Type 都是抽象类型，由渲染器具体化。
// 这里用 any 兜底（与仓库 ReactTypes.ts 的 ElementType 处理一致）。

export type Instance = any;
export type TextInstance = any;
export type Container = any;
export type Type = any;
export type Props = Record<string, any>;

// updatePayload 是 [key1, value1, key2, value2, ...] 的扁平数组，commitUpdate 按这个约定消费
export type UpdatePayload = any[];

function throwIncompatibleHost(): never {
  throw new Error(
    "This module must be shimmed by a specific renderer. " +
      "react-dom 构建时通过 fork 把 ReactDOMHostConfig 替换进本模块；" +
      "直接引用本占位模块说明 fork 配置失效。",
  );
}

export const supportsMutation = true;
export const supportsPersistence = false;

export function createInstance(
  _type: Type,
  _props: Props,
  _rootContainerInstance: Container,
  _hostContext: any,
  _internalInstanceHandle: any,
): Instance {
  throwIncompatibleHost();
}

export function createTextInstance(
  _text: string,
  _rootContainerInstance: Container,
  _hostContext: any,
  _internalInstanceHandle: any,
): TextInstance {
  throwIncompatibleHost();
}

export function appendInitialChild(
  _parentInstance: Instance,
  _child: Instance | TextInstance,
): void {
  throwIncompatibleHost();
}

export function finalizeInitialChildren(
  _instance: Instance,
  _type: Type,
  _props: Props,
  _rootContainerInstance: Container,
  _hostContext: any,
): boolean {
  throwIncompatibleHost();
}

export function prepareUpdate(
  _instance: Instance,
  _type: Type,
  _oldProps: Props,
  _newProps: Props,
  _rootContainerInstance: Container,
  _hostContext: any,
): UpdatePayload | null {
  throwIncompatibleHost();
}

export function commitUpdate(
  _instance: Instance,
  _updatePayload: UpdatePayload,
  _type: Type,
  _oldProps: Props,
  _newProps: Props,
  _internalInstanceHandle: any,
): void {
  throwIncompatibleHost();
}

export function commitTextUpdate(
  _textInstance: TextInstance,
  _oldText: string,
  _newText: string,
): void {
  throwIncompatibleHost();
}

export function appendChild(
  _parentInstance: Instance,
  _child: Instance | TextInstance,
): void {
  throwIncompatibleHost();
}

export function appendChildToContainer(
  _container: Container,
  _child: Instance | TextInstance,
): void {
  throwIncompatibleHost();
}

export function insertBefore(
  _parentInstance: Instance,
  _child: Instance | TextInstance,
  _beforeChild: Instance | TextInstance,
): void {
  throwIncompatibleHost();
}

export function insertInContainerBefore(
  _container: Container,
  _child: Instance | TextInstance,
  _beforeChild: Instance | TextInstance,
): void {
  throwIncompatibleHost();
}

export function removeChild(
  _parentInstance: Instance,
  _child: Instance | TextInstance,
): void {
  throwIncompatibleHost();
}

export function removeChildFromContainer(
  _container: Container,
  _child: Instance | TextInstance,
): void {
  throwIncompatibleHost();
}

export function shouldSetTextContent(_type: Type, _props: Props): boolean {
  throwIncompatibleHost();
}

export function getRootHostContainer(): Container {
  throwIncompatibleHost();
}

export function getHostContext(): any {
  throwIncompatibleHost();
}

export function scheduleMicrotask(_callback: () => void): void {
  throwIncompatibleHost();
}

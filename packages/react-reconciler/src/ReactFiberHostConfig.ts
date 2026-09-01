/**
 * @file HostConfig（渲染器与平台无关接口）
 * @description reconciler 通过这组接口与具体渲染器（如 react-dom）解耦，所有平台相关操作
 * 都收敛到这里。官方在构建时用 forks/ReactFiberHostConfig.custom.js 把渲染器的实现注入进来，
 * 本项目用运行时 setHostConfig 注入（react-dom 尚未搭建，验证阶段用手写 DOM config 驱动）。
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

// Mutation 模式（supportsMutation）下主链路用得到的 host 方法子集。
// 对照官方：appendChild 等「去掉 Container 后缀」的是操作具体 DOM 节点，带 ToContainer 的是
// 操作根容器（root / portal），二者在 DOM 渲染器里其实是同一份 document.appendChild 能力。
export interface HostConfig {
  supportsMutation: boolean;
  supportsPersistence: boolean;

  createInstance(
    type: Type,
    props: Props,
    rootContainerInstance: Container,
    hostContext: any,
    internalInstanceHandle: any,
  ): Instance;

  createTextInstance(
    text: string,
    rootContainerInstance: Container,
    hostContext: any,
    internalInstanceHandle: any,
  ): TextInstance;

  appendInitialChild(
    parentInstance: Instance,
    child: Instance | TextInstance,
  ): void;

  finalizeInitialChildren(
    instance: Instance,
    type: Type,
    props: Props,
    rootContainerInstance: Container,
    hostContext: any,
  ): boolean;

  prepareUpdate(
    instance: Instance,
    type: Type,
    oldProps: Props,
    newProps: Props,
    rootContainerInstance: Container,
    hostContext: any,
  ): UpdatePayload | null;

  commitUpdate(
    instance: Instance,
    updatePayload: UpdatePayload,
    type: Type,
    oldProps: Props,
    newProps: Props,
    internalInstanceHandle: any,
  ): void;

  commitTextUpdate(
    textInstance: TextInstance,
    oldText: string,
    newText: string,
  ): void;

  appendChild(parentInstance: Instance, child: Instance | TextInstance): void;
  appendChildToContainer(
    container: Container,
    child: Instance | TextInstance,
  ): void;
  insertBefore(
    parentInstance: Instance,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance,
  ): void;
  insertInContainerBefore(
    container: Container,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance,
  ): void;
  removeChild(parentInstance: Instance, child: Instance | TextInstance): void;
  removeChildFromContainer(
    container: Container,
    child: Instance | TextInstance,
  ): void;

  shouldSetTextContent(type: Type, props: Props): boolean;
  getRootHostContainer(): Container;
  getHostContext(): any;
}

// 注入的 host config，未注入前为 null，任何实际调用都会命中 checkHostConfig 抛错
let hostConfig: HostConfig | null = null;

// 对照官方：官方这个文件直接 throw，保证一旦 rollup 的 fork 配置失效、误用了兜底文件时
// 立刻报错而不是静默出错。这里等价处理：未 setHostConfig 前调用会抛「必须由渲染器 shim」。
function checkHostConfig(): HostConfig {
  if (hostConfig === null) {
    throw new Error(
      "ReactFiberHostConfig 尚未注入。reconciler 不依赖具体平台，" +
        "必须先调用 setHostConfig() 注入渲染器的实现（对照官方 forks/ReactFiberHostConfig.custom.js）。",
    );
  }
  return hostConfig;
}

/**
 * 注入渲染器的 host config（官方是构建时 fork 注入，这里运行时注入）
 * @param config - 渲染器提供的 host config 实现
 */
export function setHostConfig(config: HostConfig): void {
  hostConfig = config;
}

export const supportsMutation = true;
export const supportsPersistence = false;

export function createInstance(
  type: Type,
  props: Props,
  rootContainerInstance: Container,
  hostContext: any,
  internalInstanceHandle: any,
): Instance {
  return checkHostConfig().createInstance(
    type,
    props,
    rootContainerInstance,
    hostContext,
    internalInstanceHandle,
  );
}

export function createTextInstance(
  text: string,
  rootContainerInstance: Container,
  hostContext: any,
  internalInstanceHandle: any,
): TextInstance {
  return checkHostConfig().createTextInstance(
    text,
    rootContainerInstance,
    hostContext,
    internalInstanceHandle,
  );
}

export function appendInitialChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  checkHostConfig().appendInitialChild(parentInstance, child);
}

export function finalizeInitialChildren(
  instance: Instance,
  type: Type,
  props: Props,
  rootContainerInstance: Container,
  hostContext: any,
): boolean {
  return checkHostConfig().finalizeInitialChildren(
    instance,
    type,
    props,
    rootContainerInstance,
    hostContext,
  );
}

export function prepareUpdate(
  instance: Instance,
  type: Type,
  oldProps: Props,
  newProps: Props,
  rootContainerInstance: Container,
  hostContext: any,
): UpdatePayload | null {
  return checkHostConfig().prepareUpdate(
    instance,
    type,
    oldProps,
    newProps,
    rootContainerInstance,
    hostContext,
  );
}

export function commitUpdate(
  instance: Instance,
  updatePayload: UpdatePayload,
  type: Type,
  oldProps: Props,
  newProps: Props,
  internalInstanceHandle: any,
): void {
  checkHostConfig().commitUpdate(
    instance,
    updatePayload,
    type,
    oldProps,
    newProps,
    internalInstanceHandle,
  );
}

export function commitTextUpdate(
  textInstance: TextInstance,
  oldText: string,
  newText: string,
): void {
  checkHostConfig().commitTextUpdate(textInstance, oldText, newText);
}

export function appendChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  checkHostConfig().appendChild(parentInstance, child);
}

export function appendChildToContainer(
  container: Container,
  child: Instance | TextInstance,
): void {
  checkHostConfig().appendChildToContainer(container, child);
}

export function insertBefore(
  parentInstance: Instance,
  child: Instance | TextInstance,
  beforeChild: Instance | TextInstance,
): void {
  checkHostConfig().insertBefore(parentInstance, child, beforeChild);
}

export function insertInContainerBefore(
  container: Container,
  child: Instance | TextInstance,
  beforeChild: Instance | TextInstance,
): void {
  checkHostConfig().insertInContainerBefore(container, child, beforeChild);
}

export function removeChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  checkHostConfig().removeChild(parentInstance, child);
}

export function removeChildFromContainer(
  container: Container,
  child: Instance | TextInstance,
): void {
  checkHostConfig().removeChildFromContainer(container, child);
}

export function shouldSetTextContent(type: Type, props: Props): boolean {
  return checkHostConfig().shouldSetTextContent(type, props);
}

export function getRootHostContainer(): Container {
  return checkHostConfig().getRootHostContainer();
}

export function getHostContext(): any {
  return checkHostConfig().getHostContext();
}

/**
 * @file reconciler 内部共享类型
 * @description 对照官方 ReactInternalTypes.js：把跨模块引用的核心类型（Fiber、FiberRoot 等）
 * 集中定义在这里，模块间引用类型时 import type 这个文件，而不是直接引用某个实现文件里的具体类，
 * 避免类型定义分散在实现文件里、互相直连造成循环依赖。
 */

import type { ReactContext } from "shared/ReactTypes";

import type { FiberNode } from "./ReactFiber";
import type { FiberRootNode } from "./ReactFiberRoot";
import type { Lanes } from "./ReactFiberLane";

export type Fiber = FiberNode;

export type FiberRoot = FiberRootNode;

// 对照官方 ContextItem：fiber.dependencies.firstContext 链表的节点，记录该 fiber 在渲染时
// 读取过的某个 context 以及读到的值（memoizedValue 用于校验，本项目暂未实现的懒传播场景会用到）
export interface ContextItem<T> {
  context: ReactContext<T>;
  memoizedValue: T;
  next: ContextItem<any> | null;
}

// 对照官方 Dependencies：挂在 fiber.dependencies 上，firstContext 是本次渲染读取的 context
// 链表头，lanes 记录这些 context 关联的更新优先级（bailout 判断是否需要为 context 变化重渲染）
export interface Dependencies {
  lanes: Lanes;
  firstContext: ContextItem<any> | null;
}

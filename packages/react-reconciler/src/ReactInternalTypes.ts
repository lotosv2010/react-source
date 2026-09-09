/**
 * @file reconciler 内部共享类型
 * @description 对照官方 ReactInternalTypes.js：把跨模块引用的核心类型（Fiber、FiberRoot 等）
 * 集中定义在这里，模块间引用类型时 import type 这个文件，而不是直接引用某个实现文件里的具体类，
 * 避免类型定义分散在实现文件里、互相直连造成循环依赖。
 */

import type { FiberNode } from "./ReactFiber";
import type { FiberRootNode } from "./ReactFiberRoot";

export type Fiber = FiberNode;

export type FiberRoot = FiberRootNode;

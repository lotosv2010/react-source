/**
 * @file OffscreenComponent 类型定义
 * @description 对照官方 packages/react-reconciler/src/ReactFiberOffscreenComponent.js：
 * Suspense 内部用 Offscreen 包裹 primary/fallback 子树，通过 mode 控制隐藏/显示。
 *
 * 简化范围：官方 OffscreenState 还带 cachePool（Cache API）/transitions（transition-tracing），
 * 本项目均未实现，OffscreenState 精简为只保留 baseLanes（虽然目前也不参与调度，
 * 只是占位对齐官方"用 state 对象是否存在表示是否隐藏"的设计）。
 */

import type { Lanes } from "./ReactFiberLane";

export type OffscreenMode = "visible" | "hidden";

export interface OffscreenProps {
  mode?: OffscreenMode | null;
  children?: any;
}

// 用 state 对象是否存在表示组件是否处于隐藏态（对照官方注释）
export interface OffscreenState {
  baseLanes: Lanes;
}

export interface OffscreenInstance {
  isHidden: boolean;
}

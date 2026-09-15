/**
 * @file Fiber 节点类型标签
 * @description 标识 Fiber 对应的组件类型，beginWork/completeWork 靠 tag 分发处理逻辑
 */

// 对照官方 packages/react-reconciler/src/ReactWorkTags.js：用数字常量而非字符串枚举，
// 数值和官方保持一致，方便以后对照官方 DevTools/调试工具里看到的 tag 值。
// 当前列出主链路用得到的 tag（FunctionComponent/HostRoot/HostComponent/HostText/Fragment
// 等）+ Phase 7 的 ContextConsumer/ContextProvider + Phase 8 的 ClassComponent + Phase 9.2 的
// ForwardRef/MemoComponent + Phase 9.1 的 SuspenseComponent/OffscreenComponent（数值对齐官方，
// 12 是尚未实现的 Profiler、15-21 是尚未实现的 SimpleMemoComponent/LazyComponent 等，故意留空），
// Portal 等对应功能落地时再补，不提前铺数值。

export type WorkTag =
  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 13 | 14 | 16 | 22;

export const FunctionComponent = 0;
export const ClassComponent = 1;
export const IndeterminateComponent = 2;
export const HostRoot = 3;
export const HostPortal = 4;
export const HostComponent = 5;
export const HostText = 6;
export const Fragment = 7;
export const Mode = 8;
export const ContextConsumer = 9;
export const ContextProvider = 10;
export const ForwardRef = 11;
export const SuspenseComponent = 13;
export const MemoComponent = 14;
export const LazyComponent = 16;
export const OffscreenComponent = 22;

/**
 * @file reconciler 常量集合
 * @description 对外暴露的半公开常量（RootTag），供第三方渲染器实现 host config 时取用
 */

// 对照官方 packages/react-reconciler/src/ReactReconcilerConstants.js：
// 只暴露第三方渲染器实现 host config 所必需的最小常量集合。
// 官方还转出 DiscreteEventPriority 等事件优先级，那些等到 Phase 4 接入 Scheduler 时再补。
export { LegacyRoot, ConcurrentRoot } from "./ReactRootTags";

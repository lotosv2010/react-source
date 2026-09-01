/**
 * @file reconciler 常量集合
 * @description 对外暴露的半公开常量（RootTag），供第三方渲染器实现 host config 时取用
 */

// 对照官方 packages/react-reconciler/src/ReactReconcilerConstants.js：
// 只暴露第三方渲染器实现 host config 所必需的最小常量集合。
// 官方这里转出事件优先级常量供渲染器在事件派发时设置 currentUpdatePriority。
export { LegacyRoot, ConcurrentRoot } from "./ReactRootTags";
export {
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  IdleEventPriority,
} from "./ReactEventPriorities";

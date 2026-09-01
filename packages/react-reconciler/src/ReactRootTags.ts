/**
 * @file Root 类型标签
 * @description 标识 FiberRootNode 使用同步（Legacy）还是并发（Concurrent）渲染模式
 */

// 对照官方 packages/react-reconciler/src/ReactRootTags.js：这两个值会通过
// react-reconciler/constants 这个独立入口对外暴露，供上层渲染器（如 react-dom）
// 在 createContainer 时选择根节点的渲染模式。createContainer 等实际用到它的逻辑
// 留到 Phase 2.2 落地，这里先把常量本身对照建好。

export type RootTag = 0 | 1;

export const LegacyRoot = 0;
export const ConcurrentRoot = 1;

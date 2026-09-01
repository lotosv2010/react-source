/**
 * @file Lane 优先级模型
 * @description 用位掩码表示更新优先级，多位 lane 组合成 lanes；不同 lane 的更新可独立调度
 */

// 对照官方 packages/react-reconciler/src/ReactFiberLane.js（v18.3.1）：完整的 Lane 模型有
// 30 多条 lane（SyncLane/InputDiscreteLane/DefaultLane/TransitionLane...），用于 Scheduler
// 时间切片和优先级抢占。Phase 2/3 只有同步渲染，先只保留 SyncLane 一条，位运算助手
// （mergeLanes/includesSomeLane/isSubsetOfLanes/removeLanes）的语义与官方一致，
// 等 Phase 4 接入 Scheduler 时再展开完整 lane 表。

export type Lane = number;
export type Lanes = number;

export const NoLane: Lane = 0b0000000000000000000000000000000;
export const NoLanes: Lanes = 0b0000000000000000000000000000000;

// 同步优先级：需要立即处理（离散事件、flushSync、legacy 根上的更新）
export const SyncLane: Lane = 0b0000000000000000000000000000001;

/**
 * 求两条 lane 的并集
 * @param a - lane/lanes
 * @param b - lane/lanes
 * @returns 并集 lanes
 */
export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
  return a | b;
}

/**
 * 判断两条 lanes 是否有交集
 * @param a - lanes
 * @param b - lanes
 * @returns 是否有交集
 */
export function includesSomeLane(a: Lanes | Lane, b: Lanes | Lane): boolean {
  return (a & b) !== NoLanes;
}

/**
 * 判断 a 是否完全包含于 b
 * @param set - 待判断的子集
 * @param subset - 超集
 * @returns a 是否为 b 的子集
 */
export function isSubsetOfLanes(set: Lanes, subset: Lanes | Lane): boolean {
  return (set & subset) === set;
}

/**
 * 从 lanes 中移除指定的 lane
 * @param set - 原始 lanes
 * @param subset - 要移除的 lane
 * @returns 移除后的 lanes
 */
export function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes {
  return set & ~subset;
}

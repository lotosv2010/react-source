/**
 * @file Hook Effect 标记
 * @description 对照官方 packages/react-reconciler/src/ReactHookEffectTags.js：区分 effect 的
 * 类型（Layout/Passive/Insertion）与是否需要执行（HasEffect，由 deps 是否变化决定）。
 * commitHookEffectListMount/Unmount 用 `effect.tag & flags === flags` 做位匹配。
 */

export type HookFlags = number;

export const NoFlags: HookFlags = 0b0000;

// 是否需要执行本次 effect（deps 变化时才打这个标记）
export const HasEffect: HookFlags = 0b0001;

// 三种 effect 各自的类型标记；Insertion 对应官方 useInsertionEffect，本项目暂不实现，
// 留空位仅为了与官方数值对齐，方便对照。
export const Insertion: HookFlags = 0b0010;
export const Layout: HookFlags = 0b0100;
export const Passive: HookFlags = 0b1000;

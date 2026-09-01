/**
 * @file Scheduler feature flags
 * @description 对照官方 SchedulerFeatureFlags.js。与 HostConfig 不同，本模块是模块初始化期
 * 读取的常量（而非每个导出都 throw 的占位），因此给默认值即可；官方 fork 表可针对不同宿主
 * 替换成 www/postTask 变体，本项目先只保留 default 变体所需的默认值。
 */

// 是否启用 isInputPending 检测（默认关闭，shouldYieldToHost 只看 deadline）
export const enableIsInputPending = false;
// 是否启用 MessageChannel 消息循环（关闭则回退 setTimeout 宏任务）
export const enableMessageLoopImplementation = true;
// 是否启用 profiling mark/measure 埋点（默认关闭）
export const enableProfiling = false;

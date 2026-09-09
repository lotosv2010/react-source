/**
 * @file SchedulerHostConfig（调度宿主接口的占位实现）
 * @description 与 reconciler 的 ReactFiberConfig 同理：本模块每个导出都 throw，真正的
 * 实现由构建时 fork 注入（rollup build.js / vite resolveId 把 ./SchedulerHostConfig 重定向到
 * forks/SchedulerHostConfig.default.ts）。一旦 fork 失效误用本兜底实现会立即报错而非静默出错。
 */

function throwIncompatibleHost(): never {
  throw new Error(
    "This module must be shimmed by a specific scheduler host. " +
      "scheduler 构建时通过 fork 把 SchedulerHostConfig.default 替换进本模块；" +
      "直接引用本占位模块说明 fork 配置失效。",
  );
}

export const hasPerformanceNow = false;

export function getCurrentTime(): number {
  throwIncompatibleHost();
}

export function requestHostCallback(_callback: any): void {
  throwIncompatibleHost();
}

export function cancelHostCallback(): void {
  throwIncompatibleHost();
}

export function requestHostTimeout(_callback: any, _ms: number): void {
  throwIncompatibleHost();
}

export function cancelHostTimeout(): void {
  throwIncompatibleHost();
}

export function shouldYieldToHost(): boolean {
  throwIncompatibleHost();
}

export function requestPaint(): void {
  throwIncompatibleHost();
}

export function forceFrameRate(_fps: number): void {
  throwIncompatibleHost();
}

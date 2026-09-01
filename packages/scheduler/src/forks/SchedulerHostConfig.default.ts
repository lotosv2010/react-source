/**
 * @file SchedulerHostConfig 默认实现
 * @description 对照官方 forks/SchedulerHostConfig.default.js：用 MessageChannel 宏任务驱动
 * 消息循环（enableMessageLoopImplementation 关闭时回退 setTimeout），并实现 shouldYieldToHost
 * 的时间片判断（yieldInterval=5ms 阈值）。enableIsInputPending 默认关闭，故不接 isInputPending。
 */

import {
  enableIsInputPending,
  enableMessageLoopImplementation,
} from "../SchedulerFeatureFlags";

// performance.now 优先，Date.now 兜底
export const hasPerformanceNow =
  typeof performance === "object" && typeof performance.now === "function";

export function getCurrentTime(): number {
  return hasPerformanceNow ? performance.now() : Date.now();
}

let isMessageLoopRunning = false;
let scheduledHostCallback:
  ((hasTimeRemaining: boolean, initialTime: number) => boolean) | null = null;
let taskTimeoutID: any = -1;

// 时间片：每一段宏任务给 5ms 的渲染预算，超过 deadline 就 shouldYieldToHost 让出主线程；
// maxYieldInterval 是单帧内最长持续工作的兜底上限（对照官方 300ms）。
let yieldInterval = 5;
let deadline = 0;
const maxYieldInterval = 300;
let needsPaint = false;

export function shouldYieldToHost(): boolean {
  const currentTime = getCurrentTime();
  if (currentTime >= deadline) {
    // 本段预算用完。enableIsInputPending 默认关闭，这里不复刻 isInputPending 分支，
    // 只在有 pending paint 请求或超过最大持续上限时强制让出。
    if (needsPaint || currentTime >= maxYieldInterval) {
      return true;
    }
    return currentTime >= deadline;
  } else {
    return false;
  }
}

export function requestPaint(): void {
  if (enableIsInputPending) {
    // 官方在启用 isInputPending 时把 paint 请求透传给宿主；本项目关闭该特性，置位即可
    needsPaint = true;
  } else {
    needsPaint = true;
  }
}

// 对照官方：每帧开始时把 deadline 设为「当前时间 + yieldInterval」，跑 scheduledHostCallback，
// 还有剩余工作就再排一段，否则重置状态。
function performWorkUntilDeadline(): void {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    deadline = currentTime + yieldInterval;
    const hasTimeRemaining = true;
    try {
      const hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
      if (!hasMoreWork) {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      } else {
        schedulePerformWorkUntilDeadline();
      }
    } catch (error) {
      schedulePerformWorkUntilDeadline();
      throw error;
    }
  } else {
    isMessageLoopRunning = false;
  }
}

function schedulePerformWorkUntilDeadline(): void {
  if (
    enableMessageLoopImplementation &&
    typeof MessageChannel !== "undefined"
  ) {
    const channel = new MessageChannel();
    const port = channel.port2;
    channel.port1.onmessage = performWorkUntilDeadline;
    port.postMessage(null);
  } else {
    // MessageChannel 不可用时回退 setTimeout 宏任务
    setTimeout(performWorkUntilDeadline, 0);
  }
}

export function requestHostCallback(
  callback: (hasTimeRemaining: boolean, initialTime: number) => boolean,
): void {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}

export function cancelHostCallback(): void {
  scheduledHostCallback = null;
}

export function requestHostTimeout(
  callback: (currentTime: number) => void,
  ms: number,
): void {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}

export function cancelHostTimeout(): void {
  clearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

// 对照官方 forceFrameRate：把帧率换算成 yieldInterval（dev 调试用），非法输入报错
export function forceFrameRate(fps: number): void {
  if (fps < 0 || fps > 125) {
    console.error(
      "forceFrameRate takes a positive int between 0 and 125, " +
        "forcing frame rates higher than 125 fps is not supported",
    );
    return;
  }
  if (fps > 0) {
    yieldInterval = Math.floor(1000 / fps);
  } else {
    // reset the framerate
    yieldInterval = 5;
  }
}

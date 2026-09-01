import { jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-reconciler/src/ReactFiberWorkLoop";
import {
  unstable_scheduleCallback,
  unstable_NormalPriority,
  unstable_shouldYield,
  unstable_now,
} from "scheduler";

// 用 react-dom 的 createRoot 驱动 reconciler 的并发主链路，配合 scheduler 观察：
// 1) 原生任务分片（MessageChannel 宏任务 + 5ms 时间片）；2) 并发渲染不阻塞 rAF 帧；
// 3) flushSync 同步更新抢占低优先级并发渲染。

// 忙等 ms 毫秒，模拟单次渲染工作（用 unstable_now 计时，避免 Date.now 精度问题）
function busy(ms: number): void {
  const end = unstable_now() + ms;
  while (unstable_now() < end) {
    // 空转模拟 CPU 工作
  }
}

// 生成 count 项的 <ul> 列表，供大/小树对比
function bigList(count: number): any {
  const items: any[] = [];
  for (let i = 0; i < count; i++) {
    items.push(jsx("li", { key: i, children: "item " + i }));
  }
  return jsx("ul", { children: items });
}

// 演示 1：Scheduler 原生分片。单个长任务在 5ms 时间片内检查 shouldYield，
// 时间片用完返回续跑函数，让 Scheduler 在下一段宏任务里继续。
function demoSchedulerSlicing(): void {
  console.log("[scheduler] 原生分片：长任务在 5ms 时间片内 yield 给主线程");
  let processed = 0;
  const total = 30;
  const sliceTimes: number[] = [];

  unstable_scheduleCallback(unstable_NormalPriority, function loop() {
    const sliceStart = unstable_now();
    while (processed < total) {
      busy(1); // 每项模拟 1ms 的渲染工作
      processed++;
      if (unstable_shouldYield()) {
        break;
      }
    }
    sliceTimes.push(Math.round(unstable_now() - sliceStart));
    if (processed < total) {
      // 还有剩余工作：返回续跑函数，Scheduler 下一段宏任务继续执行
      return loop;
    }
    console.log(
      "[scheduler] 分片耗时(ms):",
      sliceTimes.join(", "),
      "，共处理",
      processed,
      "项",
    );
    return null;
  });
}

// 演示 2：并发渲染大列表不阻塞输入。渲染期间 rAF 驱动的帧计数持续跳动，
// 说明 5000 项的渲染被时间切片拆开、没有一次性占死主线程。
function demoConcurrentRender(): void {
  console.log("[concurrent] 渲染 5000 项大列表（DefaultLane 并发，时间切片）");
  const container = document.createElement("div");
  container.id = "scheduler-concurrent";
  document.body.appendChild(container);

  const counter = document.createElement("div");
  counter.textContent = "帧计数: 0";
  counter.style.cssText = "position:fixed;top:8px;right:8px;font-size:20px;";
  document.body.appendChild(counter);

  const root = createRoot(container);
  root.render(bigList(5000));

  let frames = 0;
  let committed = false;
  const tick = (): void => {
    frames++;
    counter.textContent = "帧计数: " + frames;
    if (!committed && container.querySelectorAll("li").length > 0) {
      committed = true;
      console.log(
        "[concurrent] 首次提交可见，li 数 =",
        container.querySelectorAll("li").length,
        "，渲染期间 rAF 帧数 =",
        frames,
      );
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 演示 3：flushSync 抢占。DefaultLane 大列表并发渲染到一半时，flushSync 里的同步更新
// （SyncLane）立即提交小列表；随后低优先级大列表恢复重放、最终覆盖。观察 commit 顺序
// 与「低优先级 update 不丢失」的 base 重放行为。
function demoFlushSyncInterrupt(): void {
  console.log(
    "[interrupt] 调度 big(DefaultLane) 并发渲染，然后 flushSync 抢占 small(SyncLane)",
  );
  const container = document.createElement("div");
  container.id = "scheduler-interrupt";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(bigList(5000));
  console.log(
    "[interrupt] big 已调度，当前 li 数（应尚未提交）=",
    container.querySelectorAll("li").length,
  );

  setTimeout(() => {
    flushSync(() => {
      root.render(bigList(1));
    });
    console.log(
      "[interrupt] flushSync(small) 同步提交完成，li 数 =",
      container.querySelectorAll("li").length,
    );

    setTimeout(() => {
      console.log(
        "[interrupt] DefaultLane 恢复重放后，最终 li 数 =",
        container.querySelectorAll("li").length,
      );
    }, 100);
  }, 30);
}

export default function runSchedulerDemo(): void {
  demoSchedulerSlicing();
  demoConcurrentRender();
  demoFlushSyncInterrupt();
}

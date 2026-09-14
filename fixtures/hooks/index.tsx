import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";

// Phase 5 验证：useState 管理计数器状态，setState → 重渲染 → DOM 更新。
// 事件系统（onClick 等）留到 Phase 6，这里先用 setTimeout 直接调用 dispatch 函数
// 驱动更新，验证 Dispatcher 切换 + Hook 链表 + 并发更新入队这套主链路是否走通。
let externalSetCount:
  ((updater: (prevCount: number) => number) => void) | null = null;

function Counter(): any {
  const [count, setCount] = useState(() => 0);
  externalSetCount = setCount;

  // renderCount 用 useRef 记录渲染次数：ref 不触发重渲染、跨渲染保持同一对象，
  // 与 count 的变化对比即可验证 mountRef/updateRef 是否真的跨渲染复用了同一个 { current }
  const renderCount = useRef(0);
  renderCount.current += 1;

  // double 用 useMemo 缓存，只在 count 变化时重新计算；用一个模块外可见的计数器
  // 统计 create 函数实际执行次数，验证 deps 不变时是否真的跳过了重算
  const double = useMemo(() => {
    memoComputeCount += 1;
    return count * 2;
  }, [count]);

  // logCount 用 useCallback 缓存，deps 同样是 [count]；比较两次渲染返回的函数引用
  // 是否相同，验证 deps 不变时是否真的返回了同一个函数
  const logCount = useCallback(() => {
    console.log("当前 count：", count);
  }, [count]);
  externalLogCount = logCount;

  console.log(
    `渲染第 ${renderCount.current} 次：count=${count} double=${double} memoComputeCount=${memoComputeCount}`,
  );

  // useLayoutEffect 应该在 commit 后同步执行，比 useEffect 更早——用一个模块级顺序数组
  // 记录两者实际触发顺序，验证 commitLayoutEffects（同步）先于 flushPassiveEffects（异步）
  useLayoutEffect(() => {
    effectOrder.push(`layout(count=${count})`);
    console.log("useLayoutEffect 执行，count=", count, "顺序：", effectOrder);
    return () => {
      console.log("useLayoutEffect 清理，count=", count);
    };
  }, [count]);

  useEffect(() => {
    effectOrder.push(`passive(count=${count})`);
    console.log("useEffect 执行，count=", count, "顺序：", effectOrder);
    return () => {
      console.log("useEffect 清理，count=", count);
    };
  }, [count]);

  return (
    <div className="counter">
      <p>count: {count}</p>
    </div>
  );
}

let memoComputeCount = 0;
let externalLogCount: (() => void) | null = null;
const effectOrder: string[] = [];

function runHooksDemo(): void {
  const rootElement = document.getElementById("root");
  if (rootElement === null) {
    throw new Error("找不到 #root 容器，请检查 index.html");
  }

  const root = createRoot(rootElement);
  root.render(<Counter />);
  console.log("mount 完成：", rootElement.innerHTML);

  let clicks = 0;
  let prevLogCount = externalLogCount;
  const interval = setInterval(() => {
    clicks += 1;
    externalSetCount?.((prevCount) => prevCount + 1);
    console.log(`第 ${clicks} 次 setState 后：`, rootElement.innerHTML);
    // count 每次都变化，deps=[count] 应该让 useCallback 每次都返回新函数引用
    console.log(
      "useCallback 引用是否变化（预期 true）：",
      externalLogCount !== prevLogCount,
    );
    prevLogCount = externalLogCount;
    if (clicks >= 3) {
      clearInterval(interval);
    }
  }, 1000);
}

export default runHooksDemo;

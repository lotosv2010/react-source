import {
  useCallback,
  useDeferredValue,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { createRoot } from "react-dom/client";

// useSyncExternalStore 验证：一个 React 外部的极简 store（订阅者集合 + 一个数字值），
// 不经过 setState，直接在模块级修改 value 并通知订阅者，验证 subscribeToStore 接上后
// store 变化能强制同步重渲染。
let externalStoreValue = 0;
const externalStoreListeners = new Set<() => void>();
const externalStore = {
  getSnapshot: () => externalStoreValue,
  subscribe: (onStoreChange: () => void) => {
    externalStoreListeners.add(onStoreChange);
    return () => externalStoreListeners.delete(onStoreChange);
  },
  setValue: (next: number) => {
    externalStoreValue = next;
    externalStoreListeners.forEach((listener) => listener());
  },
};

// Phase 5 验证：useState 管理计数器状态，setState → 重渲染 → DOM 更新。
// 事件系统（onClick 等）留到 Phase 6，这里先用 setTimeout 直接调用 dispatch 函数
// 驱动更新，验证 Dispatcher 切换 + Hook 链表 + 并发更新入队这套主链路是否走通。
let externalSetCount:
  ((updater: (prevCount: number) => number) => void) | null = null;

function Counter(): any {
  const [count, setCount] = useState(() => 0);
  externalSetCount = setCount;

  // useTransition：isPending 应该先变 true（紧急优先级更新），再随 callback 内的 setCount
  // 一起变回 false（TransitionLane 更新，与 setCount 同批次提交）
  const [isPending, startTransition] = useTransition();
  externalStartTransition = startTransition;
  console.log("useTransition isPending：", isPending);

  // useDeferredValue：count 是紧急更新时，deferredCount 先保留旧值，随后单独一次 TransitionLane
  // 渲染追上新值——两次渲染间应该能看到 deferredCount 落后 count 一拍
  const deferredCount = useDeferredValue(count);
  if (deferredCount !== count) {
    console.log(
      "useDeferredValue 落后：count=",
      count,
      "deferredCount=",
      deferredCount,
    );
  }

  // useSyncExternalStore：订阅模块级外部 store，不经过 setState 也应该能感知到 store 变化
  // 并强制同步重渲染——验证 subscribeToStore/updateStoreInstance/forceStoreRerender 链路
  const storeValue = useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
  );
  console.log("useSyncExternalStore storeValue：", storeValue);

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

  // useInsertionEffect 应该比 useLayoutEffect 更早——它在 mutation 阶段、DOM 变更之后
  // 立刻同步执行（commitMutationEffectsOnFiber 里），而 useLayoutEffect 要等到
  // commitLayoutEffects（root.current 切换之后）才挂载。三者叠加验证完整顺序：
  // insertion → layout → （绘制）→ passive
  useInsertionEffect(() => {
    effectOrder.push(`insertion(count=${count})`);
    console.log(
      "useInsertionEffect 执行，count=",
      count,
      "顺序：",
      effectOrder,
    );
    return () => {
      console.log("useInsertionEffect 清理，count=", count);
    };
  }, [count]);

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
let externalStartTransition: ((callback: () => void) => void) | null = null;
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

      // 用 startTransition 再触发一次更新：验证 isPending 先变 true（同步紧急更新），
      // callback 内的 setCount 落在 TransitionLane、与 setPending(false) 同批次提交
      setTimeout(() => {
        externalStartTransition?.(() => {
          externalSetCount?.((prevCount) => prevCount + 1);
        });
        console.log("startTransition 调用后：", rootElement.innerHTML);
      }, 500);

      // 不经过任何 React API，直接改外部 store 并通知订阅者：验证 subscribeToStore 接上后，
      // handleStoreChange → checkIfSnapshotChanged → forceStoreRerender 能强制同步重渲染，
      // 拿到最新的 storeValue
      setTimeout(() => {
        externalStore.setValue(externalStoreValue + 1);
        console.log("外部 store 变更后：", rootElement.innerHTML);
      }, 1000);
    }
  }, 1000);
}

export default runHooksDemo;

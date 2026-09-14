import { useState } from "react";
import { createRoot } from "react-dom/client";

// Phase 5 验证：useState 管理计数器状态，setState → 重渲染 → DOM 更新。
// 事件系统（onClick 等）留到 Phase 6，这里先用 setTimeout 直接调用 dispatch 函数
// 驱动更新，验证 Dispatcher 切换 + Hook 链表 + 并发更新入队这套主链路是否走通。
let externalSetCount:
  ((updater: (prevCount: number) => number) => void) | null = null;

function Counter(): any {
  const [count, setCount] = useState(() => 0);
  externalSetCount = setCount;

  return (
    <div className="counter">
      <p>count: {count}</p>
    </div>
  );
}

function runHooksDemo(): void {
  const rootElement = document.getElementById("root");
  if (rootElement === null) {
    throw new Error("找不到 #root 容器，请检查 index.html");
  }

  const root = createRoot(rootElement);
  root.render(<Counter />);
  console.log("mount 完成：", rootElement.innerHTML);

  let clicks = 0;
  const interval = setInterval(() => {
    clicks += 1;
    externalSetCount?.((prevCount) => prevCount + 1);
    console.log(`第 ${clicks} 次 setState 后：`, rootElement.innerHTML);
    if (clicks >= 3) {
      clearInterval(interval);
    }
  }, 1000);
}

export default runHooksDemo;

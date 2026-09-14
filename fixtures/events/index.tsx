import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";

// Phase 6 验证：合成事件 + 事件委托 + 批量更新。
// 1. 按钮 onClick 里连续两次 setCount：验证同一事件回调内多次 setState 只触发一次重渲染
// 2. input onChange：验证受控输入回显、change 事件能拿到最新 value
// 3. 外层 div onClick + 内层 button onClickCapture：验证捕获先于冒泡、stopPropagation 后
//    外层不再收到事件

function EventsDemo(): any {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`渲染第 ${renderCount.current} 次：count=${count} text=${text}`);

  const handleClick = (): void => {
    // 同一个事件回调内连续两次 setState：期望只触发一次重渲染（renderCount 只 +1）
    setCount((prev) => prev + 1);
    setCount((prev) => prev + 1);
    console.log("按钮 onClick 触发，count 应该 +2：", count);
  };

  const handleChange = (event: any): void => {
    setText(event.target.value);
    console.log("input onChange 触发，value=", event.target.value);
  };

  const handleOuterClick = (): void => {
    console.log("outer div onClick 触发（冒泡阶段）");
  };

  const handleInnerCaptureClick = (event: any): void => {
    console.log("inner button onClickCapture 触发（捕获阶段，先于冒泡）");
    if (text === "stop") {
      // 输入框填 "stop" 再点内层按钮，验证 stopPropagation 后外层 onClick 不会执行
      event.stopPropagation();
      console.log("已调用 stopPropagation，outer onClick 不应再触发");
    }
  };

  const handleInnerBubbleClick = (): void => {
    console.log("inner button onClick 触发（冒泡阶段）");
  };

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={handleClick}>点击 +2（验证批处理）</button>
      <p>text: {text}</p>
      <input
        value={text}
        onChange={handleChange}
        placeholder="输入 stop 再点内层按钮"
      />
      <div
        onClick={handleOuterClick}
        style={{ padding: "8px", border: "1px solid #ccc" }}
      >
        outer div
        <button
          onClickCapture={handleInnerCaptureClick}
          onClick={handleInnerBubbleClick}
        >
          inner button（捕获+冒泡+可能 stopPropagation）
        </button>
      </div>
    </div>
  );
}

function runEventsDemo(): void {
  const rootElement = document.getElementById("events-root");
  if (rootElement === null) {
    throw new Error("找不到 #events-root 容器，请检查 index.html");
  }
  const root = createRoot(rootElement);
  root.render(<EventsDemo />);
  console.log("events demo mount 完成：", rootElement.innerHTML);
}

export default runEventsDemo;

import { forwardRef, memo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

// Phase 9.2 验证：forwardRef 转发 ref 到内部 DOM 节点 + memo 浅比较跳过重渲染
// 1. FancyInput 用 forwardRef 转发 ref，App 里点击按钮能拿到真实 DOM 节点并 focus
// 2. MemoBox 用 memo 包裹，只有 label 变化时才重渲染，count 变化不影响它（renderCount 观察）

interface FancyInputProps {
  placeholder: string;
}

const FancyInput = forwardRef<HTMLInputElement, FancyInputProps>(
  (props, ref) => {
    console.log("FancyInput 渲染");
    return <input ref={ref} placeholder={props.placeholder} />;
  },
);

interface MemoBoxProps {
  label: string;
}

let memoBoxRenderCount = 0;

const MemoBox = memo(function MemoBox(props: MemoBoxProps): any {
  memoBoxRenderCount += 1;
  console.log(`MemoBox 渲染第 ${memoBoxRenderCount} 次，label=${props.label}`);
  return (
    <p>
      MemoBox: {props.label}（渲染次数：{memoBoxRenderCount}）
    </p>
  );
});

function App(): any {
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState("static");
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div>
      <FancyInput ref={inputRef} placeholder="点击下方按钮 focus 我" />
      <button onClick={() => inputRef.current?.focus()}>focus input</button>

      <p>count = {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>
        count+1（MemoBox 不应重渲染）
      </button>

      <MemoBox label={label} />
      <button
        onClick={() => setLabel((l) => (l === "static" ? "changed" : "static"))}
      >
        切换 label（MemoBox 应重渲染）
      </button>
    </div>
  );
}

function runForwardRefMemoDemo(): void {
  const rootElement = document.getElementById("forwardref-memo-root");
  if (rootElement === null) {
    throw new Error("找不到 #forwardref-memo-root 容器，请检查 index.html");
  }
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("forwardref-memo demo mount 完成：", rootElement.innerHTML);
}

export default runForwardRefMemoDemo;

import { createContext, useContext, useState } from "react";
import { createRoot } from "react-dom/client";

// Phase 7 验证：createContext + Provider + useContext + Consumer 变化传播
// 1. ThemeContext 无 Provider 包裹的分支应该读到 defaultValue（"light"）
// 2. 有 Provider 包裹的分支：useContext 读到 Provider 的 value，点击按钮改变 value 后，
//    只有消费该 context 的子组件应该重渲染（用 renderCount 观察）
// 3. Consumer（render prop 写法）同样能读到最新 value

const ThemeContext = createContext<string>("light");

let consumerRenderCount = 0;
let siblingRenderCount = 0;

function ThemedButton(): any {
  const theme = useContext(ThemeContext);
  consumerRenderCount += 1;
  console.log(`ThemedButton 渲染第 ${consumerRenderCount} 次，theme=${theme}`);
  return <button>当前主题：{theme}</button>;
}

// 不消费 context 的兄弟组件：Provider value 变化时，它不应该跟着重渲染
function UnrelatedSibling(): any {
  siblingRenderCount += 1;
  console.log(
    `UnrelatedSibling 渲染第 ${siblingRenderCount} 次（不应随 theme 变化）`,
  );
  return <p>我不关心 theme</p>;
}

function ConsumerDemo(): any {
  return (
    <ThemeContext.Consumer>
      {(theme: string) => <p>Consumer 读到的 theme：{theme}</p>}
    </ThemeContext.Consumer>
  );
}

function App(): any {
  const [theme, setTheme] = useState("light");

  return (
    <div>
      {/* 无 Provider 包裹：应该读到 createContext 的 defaultValue */}
      <div className="no-provider">
        <p>无 Provider 包裹，预期读到默认值 light：</p>
        <ThemedButton />
      </div>

      <ThemeContext.Provider value={theme}>
        <div className="with-provider">
          <p>有 Provider 包裹，value={theme}：</p>
          <ThemedButton />
          <ConsumerDemo />
          <UnrelatedSibling />
        </div>
      </ThemeContext.Provider>

      <button
        onClick={() =>
          setTheme((prev) => (prev === "light" ? "dark" : "light"))
        }
      >
        切换主题
      </button>
    </div>
  );
}

function runContextDemo(): void {
  const rootElement = document.getElementById("context-root");
  if (rootElement === null) {
    throw new Error("找不到 #context-root 容器，请检查 index.html");
  }
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("context demo mount 完成：", rootElement.innerHTML);
}

export default runContextDemo;

import { Component, useState } from "react";
import { createRoot } from "react-dom/client";

// Phase 9.0/9.3 验证：render 阶段抛错的 unwind 地基 + 错误边界（仅 render 阶段捕获）
// 1. Bomb：props.shouldThrow 为 true 时在 render() 里直接 throw
// 2. ErrorBoundary：getDerivedStateFromError 渲染 fallback UI，componentDidCatch 打日志，
//    覆盖"挂载时立即抛错"（MountBomb 默认 shouldThrow=true）和"更新时抛错"
//    （UpdateBomb 点击按钮后才 shouldThrow=true）两种场景
// 3. NoBoundary：不含错误边界包裹，验证 throwException 找不到边界时兜底在 HostRoot 卸载整棵树

interface BombProps {
  shouldThrow: boolean;
}

function Bomb({ shouldThrow }: BombProps): any {
  if (shouldThrow) {
    throw new Error("Bomb 组件抛出的渲染错误");
  }
  return <p>Bomb：一切正常</p>;
}

interface ErrorBoundaryProps {
  children: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: any): Partial<ErrorBoundaryState> {
    return { hasError: true, message: String(error?.message ?? error) };
  }

  componentDidCatch(error: any, info: { componentStack: string }): void {
    console.log("ErrorBoundary componentDidCatch：", error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: "" });
  };

  render(): any {
    if (this.state.hasError) {
      return (
        <div>
          <p>捕获到错误：{this.state.message}</p>
          <button onClick={this.handleReset}>重置</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MountBombDemo(): any {
  return (
    <div>
      <h4>挂载时立即抛错</h4>
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    </div>
  );
}

function UpdateBombDemo(): any {
  const [shouldThrow, setShouldThrow] = useState(false);
  return (
    <div>
      <h4>更新时抛错</h4>
      <ErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </ErrorBoundary>
      <button onClick={() => setShouldThrow(true)}>触发抛错</button>
    </div>
  );
}

function NoBoundaryDemo(): any {
  const [shouldThrow, setShouldThrow] = useState(false);
  return (
    <div>
      <h4>无错误边界兜底（触发后整棵树被卸载，控制台打印错误）</h4>
      <Bomb shouldThrow={shouldThrow} />
      <button onClick={() => setShouldThrow(true)}>触发抛错（无边界）</button>
    </div>
  );
}

function App(): any {
  return (
    <div>
      <MountBombDemo />
      <UpdateBombDemo />
      <NoBoundaryDemo />
    </div>
  );
}

function runErrorBoundaryDemo(): void {
  const rootElement = document.getElementById("error-boundary-root");
  if (rootElement === null) {
    throw new Error("找不到 #error-boundary-root 容器，请检查 index.html");
  }
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("error-boundary demo mount 完成：", rootElement.innerHTML);
}

export default runErrorBoundaryDemo;

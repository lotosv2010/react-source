import { Component, PureComponent } from "react";
import { createRoot } from "react-dom/client";

// Phase 8 验证：Class 组件挂载/更新生命周期 + setState/forceUpdate + PureComponent 浅比较
// 1. Counter：验证 constructor → getDerivedStateFromProps → render → componentDidMount，
//    以及更新阶段 shouldComponentUpdate → render → getSnapshotBeforeUpdate → componentDidUpdate，
//    卸载时 componentWillUnmount 应该被调用
// 2. setState 回调、forceUpdate（跳过 shouldComponentUpdate）
// 3. PureComponent：props 浅相等时应跳过 render（renderCount 不增加）

interface CounterProps {
  step: number;
}

interface CounterState {
  count: number;
  lastStep: number;
}

class Counter extends Component<CounterProps, CounterState> {
  renderCount = 0;

  constructor(props: CounterProps) {
    super(props);
    this.state = { count: 0, lastStep: props.step };
    console.log("Counter constructor，初始 state：", this.state);
  }

  static getDerivedStateFromProps(
    props: CounterProps,
    state: CounterState,
  ): Partial<CounterState> | null {
    if (props.step !== state.lastStep) {
      console.log("getDerivedStateFromProps：step 变化，同步 lastStep");
      return { lastStep: props.step };
    }
    return null;
  }

  shouldComponentUpdate(
    _nextProps: CounterProps,
    nextState: CounterState,
  ): boolean {
    const should = nextState.count !== this.state.count;
    console.log("shouldComponentUpdate ->", should);
    return should;
  }

  getSnapshotBeforeUpdate(prevProps: CounterProps): string {
    const snapshot = `更新前 count=${this.state.count}，旧 step=${prevProps.step}`;
    console.log("getSnapshotBeforeUpdate:", snapshot);
    return snapshot;
  }

  componentDidMount(): void {
    console.log("Counter componentDidMount，count =", this.state.count);
  }

  componentDidUpdate(
    _prevProps: CounterProps,
    prevState: CounterState,
    snapshot: string,
  ): void {
    console.log(
      `Counter componentDidUpdate：${prevState.count} -> ${this.state.count}，快照：${snapshot}`,
    );
  }

  componentWillUnmount(): void {
    console.log("Counter componentWillUnmount");
  }

  handleIncrement = (): void => {
    this.setState(
      (prev) => ({ count: prev.count + this.props.step }),
      () => console.log("setState 回调：count 已更新为", this.state.count),
    );
  };

  handleForceUpdate = (): void => {
    // 不改变任何 state，只验证 forceUpdate 能跳过 shouldComponentUpdate 强制重渲染
    this.forceUpdate(() => console.log("forceUpdate 回调触发"));
  };

  render(): any {
    this.renderCount += 1;
    console.log(`Counter render 第 ${this.renderCount} 次`);
    return (
      <div>
        <p>
          count = {this.state.count}（render 次数：{this.renderCount}）
        </p>
        <button onClick={this.handleIncrement}>+{this.props.step}</button>
        <button onClick={this.handleForceUpdate}>forceUpdate</button>
      </div>
    );
  }
}

interface PureBoxProps {
  label: string;
}

let pureRenderCount = 0;

class PureBox extends PureComponent<PureBoxProps> {
  render(): any {
    pureRenderCount += 1;
    console.log(
      `PureBox 渲染第 ${pureRenderCount} 次，label=${this.props.label}`,
    );
    return <p>PureBox: {this.props.label}</p>;
  }
}

interface AppState {
  step: number;
  showCounter: boolean;
  label: string;
}

class App extends Component<Record<string, never>, AppState> {
  constructor(props: Record<string, never>) {
    super(props);
    this.state = { step: 1, showCounter: true, label: "static" };
  }

  render(): any {
    return (
      <div>
        <Counter step={this.state.step} />
        <PureBox label={this.state.label} />
        <button
          onClick={() => this.setState((prev) => ({ step: prev.step + 1 }))}
        >
          step+1（触发 getDerivedStateFromProps）
        </button>
        <button onClick={() => this.setState({ label: this.state.label })}>
          相同 label 重新 setState（PureBox 不应重渲染）
        </button>
        <button
          onClick={() =>
            this.setState({ showCounter: !this.state.showCounter })
          }
        >
          {this.state.showCounter ? "卸载 Counter" : "重新挂载 Counter"}
        </button>
        {this.state.showCounter && <Counter step={this.state.step} />}
      </div>
    );
  }
}

function runClassDemo(): void {
  const rootElement = document.getElementById("class-root");
  if (rootElement === null) {
    throw new Error("找不到 #class-root 容器，请检查 index.html");
  }
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("class demo mount 完成：", rootElement.innerHTML);
}

export default runClassDemo;

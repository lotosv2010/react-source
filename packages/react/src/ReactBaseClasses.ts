/**
 * @file Component / PureComponent 基类
 * @description 对照官方 packages/react/src/ReactBaseClasses.js：Component 只是一个"标记"基类，
 * 真正的 setState/forceUpdate 实现挂在 updater 上（reconciler 在实例化时注入 classComponentUpdater），
 * react 包本身不知道 Fiber/updateQueue 的存在。官方用 function + prototype 赋值实现（Flow 环境），
 * 这里改用 TS class + 泛型，方便业务代码写 `class Foo extends Component<Props, State>` 时拿到
 * this.props/this.state/this.setState 的类型推导，运行时行为（updater 注入、isReactComponent
 * 标记）与官方一致。
 */

// 官方用这个空对象占位：还没被 reconciler 注入真正的 updater 之前，setState/forceUpdate
// 不应该被调用到（调用点都在 render 之后由 reconciler 保证 updater 已挂好）。
const ReactNoopUpdateQueue = {
  enqueueSetState(): void {},
  enqueueForceUpdate(): void {},
};

const emptyObject = {};

export class Component<P = Record<string, never>, S = Record<string, never>> {
  // 官方用 prototype.isReactComponent 标记区分 class/function 组件（shouldConstruct），
  // reconciler 的 ReactFiberClassComponent 靠这个字段判断
  static isReactComponent = {};

  props: P;
  context: any;
  refs: any;
  updater: any;
  state: S;

  constructor(props: P, context?: any, updater?: any) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
    this.state = null as any;
  }

  /**
   * setState() - 合并部分 state，触发重渲染
   * @param partialState - 部分 state 对象，或 (prevState, props) => 部分 state 的函数
   * @param callback - state 应用并重渲染后执行的回调
   */
  setState(
    partialState:
      Partial<S> | null | ((prevState: S, props: P) => Partial<S> | null),
    callback?: () => void,
  ): void {
    if (
      typeof partialState !== "object" &&
      typeof partialState !== "function" &&
      partialState != null
    ) {
      throw new Error(
        "takes an object of state variables to update or a function which returns an object of state variables.",
      );
    }
    this.updater.enqueueSetState(this, partialState, callback, "setState");
  }

  /**
   * forceUpdate() - 跳过 shouldComponentUpdate，强制重渲染
   * @param callback - 重渲染后执行的回调
   */
  forceUpdate(callback?: () => void): void {
    this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  }
}

(Component.prototype as any).isReactComponent = {};

/**
 * PureComponent() - 自带浅比较 props/state 的 shouldComponentUpdate
 * 对照官方：借助原型链继承 Component 的 setState/forceUpdate，只多打一个
 * isPureReactComponent 标记，ReactFiberClassComponent 的 checkShouldComponentUpdate
 * 靠这个字段判断该走浅比较还是"没有 sCU 就总是更新"的默认行为。
 */
export class PureComponent<
  P = Record<string, never>,
  S = Record<string, never>,
> extends Component<P, S> {
  static isPureReactComponent = true;
}

(PureComponent.prototype as any).isPureReactComponent = true;

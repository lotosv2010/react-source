import { isFunction } from "../utils";
import { compareTwoElement } from "./vdom";

// 更新队列
export const updateQueue = {
  updaters: [], // 这里放着将要执行的更新器对象
  isPending: false, // 是否批量更新模式，如果 isPending=true 则处于批量更新模式
  add(updater) { // 放进去之后就完事，不进行真正的更新，什么时候更新？需要调用 batchUpdate 方法才会真正更新
    this.updaters.push(updater);
  },
  batchUpdate() { // 强行执行批量更新
    const {updaters} = this;
    this.isPending = true; // 进入批量更新模式
    let updater = updaters.pop();
    while(updater) {
      updater.updateComponent(); // 更新所有脏（dirty）组件
      updater = updaters.pop();
    }
    this.isPending = false;
  }
}
class Updater {
  constructor(componentInstance) {
    this.componentInstance = componentInstance;// 一个Updater和一个类组件实例是一一对应关系
    this.pendingState = []; // 更新可能是批量的，如果处于批量更新的话，需要把状态都先暂存到这个数组，最后在更新的时候统一合并
    this.nextProps = null; // 新的属性对象
  }
  addState(partialState) {
    this.pendingState.push(partialState); // 先把新状态放入数组中
    this.emitUpdate(); // 开始视图更新
  }
  emitUpdate(nextProps) { // 可能会传一个新的属性对象过来
    this.nextProps = nextProps;
    // 如果传递了新的属性对象或者当前非批量更新模式的话就直接更新，否则先不更新
    // 如果有新属性对象或者立即更新的话
    if(nextProps || !updateQueue.isPending) {
      this.updateComponent();
    } else { // 如果当前是批量更新模式，则把自己这个updater实例放到 updateQueue 数组里
      updateQueue.add(this);
    }
  }
  updateComponent() {
    const {componentInstance, pendingState, nextProps} = this;
    if(nextProps || pendingState.length > 0) { // 长度大于0说明有等待执行合并的更新状态
      shouldUpdate(componentInstance, nextProps, this.getState())
    }
  }
  getState() {
    const {componentInstance, pendingState} = this;
    let {state} = componentInstance; // 获取老组件的当前状态
    if(pendingState.length > 0) {
      pendingState.forEach(nextState => {
        if(isFunction(nextState)) {
          state = nextState.call(componentInstance, state);
        } else {
          state = {...state, ...nextState}
        }
      })
    }
    pendingState.length = 0; // 清除pendingState
    return state
  }
}

// 判断是否要更新
function shouldUpdate(componentInstance, nextProps, nextState) {
  componentInstance.props = nextProps;
  componentInstance.state = nextState;
  // todo: old-lifecycle
  if(componentInstance.shouldComponentUpdate && !componentInstance.shouldComponentUpdate(nextProps, nextState)) {
    return false; // 不更新
  }
  componentInstance.forceUpdate();
}

class Component {
  constructor(props) {
    this.props = props
    this.$updater = new Updater(this); // this 就是类组件的实例
    this.state = {}; // 当前状态
    this.nextProps = null; // 下一个属性对象
  }
  setState(partialState) { // 批量更新 partialState 部分，因为状态可能会合并
    this.$updater.addState(partialState);
  }
  forceUpdate() { // 组件实际更新
    // console.log('forceUpdate');
    const {renderElement: oldRenderElement} = this;
    // todo: old-lifecycle
    if(this.componentWillUpdate) {
      this.componentWillUpdate(); // 组件将要更新
    }
    const newRenderElement = this.render(); // 重新渲染获取新的React元素
    const currentElement = compareTwoElement(oldRenderElement, newRenderElement);
    this.renderElement = currentElement;
    // todo: old-lifecycle
    if(this.componentDidUpdate) {
      this.componentDidUpdate(); //组件更新完成
    }
  }
}

// 类组件和函数组件编译之后都是函数，通过此属性来区分
Component.prototype.isReactComponent = {}

export {
  Component
}
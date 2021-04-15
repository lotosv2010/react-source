import { isFunction } from './utils'
import { createDOM } from './react-dom'
// 定义并导出一个变量
export const updateQueue = {
  updaters: [], // 更新器的数组，默认是一个空数组
  isBatchingUpdate: false, // 是否处于批量更新模式
  add(updater) {
    this.updaters.push(updater)
  },
  // 先通过add方法添加updater，然后在合适的时候会调用这个批量更新方法，一次性全部更新updater
  batchUpdate() {
    this.isBatchingUpdate = true
    // 把数组中的updaters全部取出，进行批量或者说全量更新
    this.updaters.forEach(updater => updater.updateComponent())
    this.updaters.length = 0
    this.isBatchingUpdate = false // 设置为非批量更新模式
  }
}

class Updater {
  constructor(classInstance) {
    this.classInstance = classInstance
    this.pendingStates = [] // 这是一个数组，用来缓存所有的状态
  }
  addState(partialState) {
    // 先把状态或这更新函数放在数组里进行缓存
    this.pendingStates.push(partialState)
    // 判断当前是否处于批量更新模式(异步)，如果是的话则先添加更新队列里去等待更新
    // 否则说明处于非批量更新模式(同步)，直接更新组件
    updateQueue.isBatchingUpdate ? updateQueue.add(this) : this.updateComponent()
  }
  updateComponent() {
    // updater里的类组件实例和数组中的状态
    const { pendingStates, classInstance } = this
    if(pendingStates.length > 0) {
      // 从pendingStates中得到新的状态
      classInstance.state = this.getState()
      // 然后重新渲染，进行更新
      classInstance.forceUpdate()
    }
  }
  getState() {
    const { pendingStates, classInstance } = this
    const { state } = classInstance // 组件实例中的状态
    if(pendingStates.length > 0) {
      const nextState = pendingStates.reduce((nextState, partialState) => {
        if(isFunction(partialState)) { // 当partialState是一个函数的时候
          nextState = partialState(nextState)
        } else { // 如果是对象的话直接覆盖
          nextState = {...nextState, ...partialState}
        }
        return nextState
      }, state)
      pendingStates.length = 0
      return nextState
    }
  }
}
class Component {
  constructor(props) {
    this.props = props;
    this.state = {}
    this.$updater = new Updater(this)
  }
  // 只放更新状态
  setState(partialState) {
    this.$updater.addState(partialState)
  }
  // 让这个组件的状态改变后，重新render，得到新的虚拟DOM，然后从新的虚拟DOM得到真实的DOM
  // 然后用新的真实DOM替换老的真实DOM就可以实现更新了
  // todo:此处需要做diff算法
  forceUpdate() {
    const newVdom = this.render()
    const newDOM = createDOM(newVdom)
    const oldDOM = this.dom
    oldDOM.parentNode.replaceChild(newDOM, oldDOM)
    this.dom = newDOM
  }
}
Component.prototype.isReactComponent = {}
export default Component
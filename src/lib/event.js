import {updateQueue} from './component'
// 合成事件对象
let SyntheticBaseEvent = {}
/**
 * 实现合成事件
 *  1.为了性能，快速回收 event 对象
 *  2.为了兼容性，屏蔽浏览器差异
 *  3.为了实现批量更新
 * @param {原生事件} event 
 */
function dispatchEvent(event) {
  // target: dom元素，type: 事件类型，例如click
  const { target, type} = event
  const eventType = `on${type}`
  const { store } = target
  const listener = store && store[eventType]
  if(listener) {
    // 让合成事件的原生事件指向真实的事件对象
    SyntheticBaseEvent.nativeEvent = event
    for (const key in event) {
      const e = event[key];
      SyntheticBaseEvent[key] = e
    }
    // todo:进入批量更新模式
    updateQueue.isBatchingUpdate = true
    listener.call(null, {...SyntheticBaseEvent})
    // todo:退出批量更新模式，进入直接更新同步模式
    // updateQueue.isBatchingUpdate = false
    updateQueue.batchUpdate() // 在事件执行后进行批量更新
    for (const key in SyntheticBaseEvent) {
      SyntheticBaseEvent[key] = null
    }
  }
}
 
/**
 * 绑定事件
 * 在React不是直接绑定，而是采用了一种合成事件的方式来处理的
 * 是一个事件委托
 * @param {要绑定的事件的真实DOM} dom 
 * @param {绑定事件的类型} eventType 
 * @param {事件回调函数} listener 
 */
export function addEvent(dom, eventType, listener) {
  // 在DOM元素会保存一个对象
  const store = dom.store || (dom.store = {})
  store[eventType] = listener
  document.addEventListener(eventType.slice(2), dispatchEvent, false)
}

import {updateQueue} from '../react/component'
/**
 * 在React我们并不是把事件绑定在DOM节点上，而是绑定到document上，类似事件委托
 * 1.因为合成事件可以屏蔽浏览器的差异，不同浏览器绑定事件和触发事件的方式不一样
 * 2.合成可以实现事件对象复用，重用，减少垃圾回收，提高性能
 * 3.因为默认要实现批量更新， 两个setState合成一次更新
 * @param {dom节点} dom
 * @param {事件类型} eventType
 * @param {事件处理函数} listener
 */
export function addEvent(dom, eventType, listener) {
  eventType = eventType.toLowerCase(); // onClick => onclick
  // 要绑定的DOM节点挂载一个对象，准备存放监听函数
  const eventStore = dom.eventStore || (dom.eventStore = {})
  // eventStore.onclick = () => console.log('onclick')
  eventStore[eventType] = listener;
  // 第一个阶段是捕获，第二个阶段是冒泡， false是冒泡
  document.addEventListener(eventType.slice(2), dispatchEvent, false)
}

// event 就是原生事件对象，但是React传递的监听函数并不是原生的，而是经过包装后的函数
// 所有的事件函数都会进入 dispatchEvent
let syntheticEvent = null;
function dispatchEvent(event) {
  let {type, target} = event;
  const eventType = `on${type}`;
  syntheticEvent = getSyntheticEvent(event);
  // todo：在事件监听函数执行之前进入批量更新模式
  updateQueue.isPending = true;
  // 模拟冒泡
  while(target) {
    const {eventStore} = target;
    const listener = eventStore && eventStore[eventType]; // onclick
    if(listener) {
      listener.call(target, syntheticEvent);
    }
    target = target.parentNode;
  }
  // 等所有的监听函数都执行完了，就可以清掉所有属性了，供下次复用此对象
  for (const key in syntheticEvent) {
    if (Object.hasOwnProperty.call(syntheticEvent, key)) {
      Reflect.deleteProperty(syntheticEvent, key);
    }
  }
  // todo：当事件处理函数执行完成后，把批量更新模式改为 false
  updateQueue.isPending = false;
  // todo：执行批量更新，就是把缓存的 updater 全部执行了
  updateQueue.batchUpdate();
}

// 如果执行了 persist ，就让 syntheticEvent 指向了一个新的对象， while循环结束后在清除的是新的对象
function persist() {
  syntheticEvent = {};
  Reflect.setPrototypeOf(syntheticEvent, {persist})
}

function getSyntheticEvent(nativeEvent) {
  if(!syntheticEvent) {
    syntheticEvent = {};
    Reflect.setPrototypeOf(syntheticEvent, {persist})
  }
  syntheticEvent.nativeEvent = nativeEvent;
  syntheticEvent.currentTarget = nativeEvent.target;
  for (const key in nativeEvent) { // 把原生事件上的方法和属性都拷贝到合成事件对象上
    if (typeof nativeEvent[key] === 'function') { // 防止this出问题
      syntheticEvent[key] = nativeEvent[key].bind(nativeEvent);
    } else {
      syntheticEvent[key] = nativeEvent[key];
    }
  }
  return syntheticEvent;
}
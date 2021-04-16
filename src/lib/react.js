import Component from './component'
/**
 * 创建react元素
 * @param {元素类型} type 
 * @param {配置对象} config 
 * @param {子节点，无子节点时为 undefined ，一个子节点时为独生子，多个子节点时为第一个子节点 } children 
 */
function createElement(type,config, children) {
  console.log(config)
  let ref
  if(config) {
    Reflect.deleteProperty(config, '__source')
    Reflect.deleteProperty(config, '__self')
    // todo:ref
    if(config.ref) {
      ref = config.ref
      config.ref = {}
    }
  }
  const props = {...config}
  if(arguments.length > 3) {
    children = Array.prototype.slice.call(arguments, 2)
  }
  props.children = children
  return {
    type,
    props,
    ref
  }
}

function createRef() {
  return {
    current: null
  }
}
const React = {
  createElement,
  Component,
  createRef
}
export default React
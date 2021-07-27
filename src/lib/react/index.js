import { CLASS_COMPONENT, ELEMENT, FUNCTION_COMPONENT, TEXT } from "./constant";
import { ReactElement } from './vdom';
import { Component } from "./component";

function createElement(type, config={}, ...children) {
  if(config) {
    Reflect.deleteProperty(config, '__source')
    Reflect.deleteProperty(config, '__self')
  }
  const {key, ref, ...props} = config;
  let $$typeof = null;
  if(typeof type === 'string') { // 是一个原声的DOM类型，如 div、span、button
    $$typeof = ELEMENT;
  } else if (typeof type === 'function' && type.prototype.isReactComponent) { // 是一个类组件
    $$typeof = CLASS_COMPONENT;
  } else if (typeof type === 'function') { // 是一个函数组件
    $$typeof = FUNCTION_COMPONENT;
  }
  props.children = children.map(item => {
    if(typeof item === 'object') { // React.createElement('span', {style: {color: 'red'}}, 'hello')
      return item;
    } else { // item = 'hello'
      return {$$typeof: TEXT, type: TEXT, content: item};
    }
  })
  return ReactElement($$typeof, type, key, ref, props);
}

function createRef() {
  return {
    current: null
  }
}

export {
  Component,
  createElement,
  createRef
}

const React = {
  createElement,
  Component,
  createRef
}
export default React
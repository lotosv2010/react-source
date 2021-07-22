import { onlyOne, setProps } from "../utils";
import { ELEMENT, TEXT } from "./constant";

export function ReactElement($$typeof, type, key, ref, props) {
  const element = {$$typeof, type, key, ref, props}
  return element
}

export function createDOM(element) {
  element = onlyOne(element); // todo 为什么这么写？
  const {$$typeof} = element;
  let dom = null
  if(!$$typeof) { // element 是一个字符串或者数字
    dom = document.createTextNode(element);
  } else if ($$typeof === TEXT) { // 对象 {$$typeof: TEXT}
    dom = document.createTextNode(element.content);
  } else if ($$typeof === ELEMENT) { // 虚拟节点是一个原生DOM节点
    dom = createNativeDOM(element)
  }
  return dom
}

function createNativeDOM(element) {
  const {type, props} = element; // 如 button span 等
  const dom = document.createElement(type);
  // todo 1.创建虚拟DOM节点的子节点
  createNativeDOMChildren(dom, props.children);
  // todo 2.给此DOM元素添加属性
  setProps(dom, props);
  return dom
}

function createNativeDOMChildren(parentNode, children) {
  children && children.forEach(c => {
    const childDOM = createDOM(c); // 创建子虚拟DOM节点的真实DOM元素
    parentNode.appendChild(childDOM);
  });
}
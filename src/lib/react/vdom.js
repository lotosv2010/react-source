import { onlyOne, setProps, flatten } from "../utils";
import { CLASS_COMPONENT, ELEMENT, FUNCTION_COMPONENT, TEXT } from "./constant";

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
  } else if ($$typeof === FUNCTION_COMPONENT) { // 虚拟节点是一个函数组件
    dom = createFunctionComponentDOM(element);
  } else if ($$typeof === CLASS_COMPONENT) { // 虚拟节点是一个类组件
    dom = createClassComponentDOM(element);
  } else { // fragment
    element = {...element, type: 'div'}
    dom = createNativeDOM(element)
  }
  return dom
}

function createNativeDOM(element) {
  const {type, props} = element; // 如 button span 等
  const dom = document.createElement(type);
  // todo 1.创建虚拟DOM节点的子节点
  createDOMChildren(dom, props.children);
  // todo 2.给此DOM元素添加属性
  setProps(dom, props);
  return dom
}

function createDOMChildren(parentNode, children) {
  children && flatten(children).forEach((c, i) => {
    // c 其实是虚拟DOM
    // 我们在虚拟DOM上添加一个属性 _mountIndex，指向此虚拟DOM节点在父节点中的索引位置
    //! todo: 在后面的dom-diff的时候会用到
    c._mountIndex = i;
    const childDOM = createDOM(c); // 创建子虚拟DOM节点的真实DOM元素
    parentNode.appendChild(childDOM);
  });
}

function createFunctionComponentDOM(element) {
  const {type, props} = element; // type = 函数组件
  const renderElement = type(props); // 返回要渲染的 react 元素
  // todo: 缓存虚拟DOM节点，方便下次dom-diff
  element.renderElement = renderElement;
  const newDOM = createDOM(renderElement);
  // 从虚拟DOM(React元素)创建出来真实DOM
  // 创建出来以后会把真实DOM添加到虚拟DOM的dom属性上
  // todo: 即虚拟DOM的属性指向真实DOM
  renderElement.dom = newDOM;
  //! todo: element.renderElement.dom => 真实DOM元素
  return newDOM;
}

function createClassComponentDOM(element) {
  const {type, props} = element; // type = 类组件
  const componentInstance = new type(props); // 创建类组件实例
  // todo: 当创建类组件实例后，会在类组件的虚拟DOM上添加一个属性 componentInstance 指向类组件的实例
  element.componentInstance = componentInstance;
  const renderElement = componentInstance.render();
  // 在类组件实例上添加 renderElement，指向上一次要渲染的虚拟DOM节点
  //! todo：在后面组件更新的时候，会重新render，然后跟上一次的 renderElement 进行 dom-diff
  componentInstance.renderElement = renderElement;
  const newDOM = createDOM(renderElement);
  renderElement.dom = newDOM;
  //! todo: element.componentInstance.renderElement.dom => 真实DOM元素
  return newDOM;
}
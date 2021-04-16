import { addEvent } from './event'
/**
 * 把vdom转换成真实的DOM并且插入到parentDOM里面
 * @param {虚拟DOM，react元素，也就是一个JS对象} vdom 
 * @param {真实DOM} parentDOM 
 */
function render(vdom, parentDOM) {
  const dom = createDOM(vdom)
  parentDOM.appendChild(dom)
}

/**
 * 把vdom转换成真实的DOM并且插入到页面中
 * @param {虚拟DOM} vdom 
 */
export function createDOM(vdom) {
  if(typeof vdom === 'string' || typeof vdom === 'number') {
    return document.createTextNode(vdom)
  }
  console.log(vdom)
  const { type, props, ref } = vdom
  let dom
  // todo: 函数/类组件
  if(typeof type === 'function') {
    return (type.prototype.isReactComponent && updateClassComponent(vdom)) || updateFunctionComponent(vdom)
  } else { // todo: 原生标签
    dom = document.createElement(type)
  }
  if(ref) {
    ref.current = dom
  }
  updateProps(dom, props)
  props && reconcileChildren(props.children, dom)
  return dom
}

/**
 * 把props上的属性赋值给真实DOM元素
 * todo此方法不支持children
 * @param {真实DOM} dom 
 * @param {属性对象} props 
 */
function updateProps(dom, props) {
  for (const key in props) {
    if (Object.hasOwnProperty.call(props, key)) {
      if(key === 'children') {
        continue
      } else if(key === 'style') {
        const style = props[key]
        for (const attr in style) {
          if (Object.hasOwnProperty.call(style, attr)) {
            dom.style[attr] = style[attr]
          }
        }
      } else if(key.startsWith('on')) {
        // todo:处理事件属性
        addEvent(dom, key.toLocaleLowerCase(), props[key])
      } else {
        dom[key] = props[key]
      }
    }
  }
}

/**
 * 处理子节点
 * @param {子节点} children 
 * @param {真实DOM} dom 
 */
function reconcileChildren(children, parentDOM) {
  // todo:子节点是字符串，说明子节点只有一个元素，并且是文本节点
  if(typeof children === 'string' || typeof children === 'number') {
    return parentDOM.textContent = children
  }
  // todo:子节点是对象，并且不是数组，说明子节点只有一个元素，并且不是文本节点
  if(typeof children === 'object' && !Array.isArray(children)) {
     return render(children, parentDOM)
  }
  // todo: 子节点是对象，并且是数组，说明子节点有多个元素
  if(Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const element = children[i]
      render(element, parentDOM)
    }
    return
  }
  // todo: 其他
  parentDOM.textContent = (children && children.toString()) || ''
}

/**
 * 函数组件转真实DOM
 * @param {虚拟DOM} vdom 
 */
function updateFunctionComponent(vdom) {
  const { type, props} = vdom
  const renderVDom = type(props)
  return createDOM(renderVDom)
}

/**
 * 类组件转真实DOM
 * @param {虚拟DOM} vdom 
 */
 function updateClassComponent(vdom) {
  let { type: ClassComponent, props, ref} = vdom
  const classInstance = new ClassComponent(props)
  // todo: 类组件ref
  if(ref) {
    ref.current = classInstance
  }
  const renderVDom = classInstance.render(props)
  const dom = createDOM(renderVDom)
  // 在类的实例上挂载一个属性DOM，指向此类实例对应的真实DOM
  classInstance.dom = dom
  return dom
}


const ReactDOM = {
  render
}

export default ReactDOM
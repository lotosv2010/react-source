import { onlyOne, setProps, flatten, patchProps } from "../utils";
import { CLASS_COMPONENT, ELEMENT, FUNCTION_COMPONENT, INSERT, MOVE, REMOVE, TEXT } from "./constant";
import {updateQueue} from './component';
let updateDepth = 0;
const diffQueue = []; //! 这是一个补丁包，记录了哪些节点需要删除，哪些节点需要添加

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
  element.dom = dom; // 不管什么元素都让dom属性指向真实dom元素
  return dom
}

function createNativeDOM(element) {
  const {type, props, ref} = element; // 如 button span 等
  const dom = document.createElement(type);
  // todo 1.创建虚拟DOM节点的子节点
  createDOMChildren(dom, props.children);
  // todo 2.给此DOM元素添加属性
  setProps(dom, props);
  //!!! ref
  if(ref) {
    ref.current = dom;
  }
  return dom
}

function createDOMChildren(parentNode, children) {
  children && flatten(Array.isArray(children) ? children: [children]).forEach((c, i) => {
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

function unstable_batchedUpdate(fn) {
  updateQueue.isPending = true; // 强行处理批量模式
  fn();
  updateQueue.isPending = false;
  updateQueue.batchUpdate();
}

function createClassComponentDOM(element) {
  const {type, props, ref} = element; // type = 类组件
  const componentInstance = new type(props); // 创建类组件实例
  if(type.contextType) {
    componentInstance.context = type.contextType.Provider.value;
  }
  //!!! ref
  if(ref) {
    ref.current = componentInstance;
  }
  // todo: 当创建类组件实例后，会在类组件的虚拟DOM上添加一个属性 componentInstance 指向类组件的实例
  element.componentInstance = componentInstance;
  // todo: old-lifecycle
  if(componentInstance.componentWillMount) {
    componentInstance.componentWillMount()
  }
  // todo: new-lifecycle
  if(type.getDerivedStateFromProps) {
    const prevState = componentInstance.state;
    const newState = type.getDerivedStateFromProps(props, prevState)
    if(newState) {
      componentInstance.state = {...componentInstance.state, ...newState};
    }
  }
  const renderElement = componentInstance.render();
  // 在类组件实例上添加 renderElement，指向上一次要渲染的虚拟DOM节点
  //! todo：在后面组件更新的时候，会重新render，然后跟上一次的 renderElement 进行 dom-diff
  componentInstance.renderElement = renderElement;
  const newDOM = createDOM(renderElement);
  renderElement.dom = newDOM;
  // todo: old-lifecycle
  if(componentInstance.componentDidMount) {
    unstable_batchedUpdate(() => componentInstance.componentDidMount());
  }
  //! todo: element.componentInstance.renderElement.dom => 真实DOM元素
  return newDOM;
}

export function compareTwoElement(oldRenderElement, newRenderElement) {
  oldRenderElement = onlyOne(oldRenderElement);
  newRenderElement = onlyOne(newRenderElement);
  let currentDOM = oldRenderElement.dom; // 先取出老的DOM
  let currentElement = oldRenderElement;
  if(newRenderElement == null) { // 如果新的虚拟节点为null，则有删除老的节点
    currentDOM.parentNode.removeChild(currentDOM);
    currentDOM = null;
  } else if(oldRenderElement.type !== newRenderElement.type) { // 虚拟节点类型不一样，则需要替换
    const newDOM = createDOM(newRenderElement);
    currentDOM.parentNode.replaceChild(newDOM, currentDOM);
    currentElement = newRenderElement;
  } else { //! todo：新老节点都有，并且类型一样，真正的 dom-diff
    updateElement(oldRenderElement, newRenderElement);
  }
  return currentElement;
}

function updateElement(oldElement, newElement) {
  // 获取老的页面上真实存在的DOM节点
  const currentDOM = newElement.dom = oldElement.dom;
  if(oldElement.$$typeof === TEXT && newElement.$$typeof === TEXT) {
    if(oldElement.content !== newElement.content) { // 如果老的文本内容和新的文本内容不一样
      currentDOM.textContent = newElement.content;
    }
  } else if(oldElement.$$typeof === ELEMENT) { // 如果是元素类型
    //! 先更新的是父节点的属性，在比较更新子节点
    updateDOMProperties(currentDOM, oldElement.props, newElement.props);
    //! 递归更新子元素
    updateChildrenElement(currentDOM, oldElement.props.children, newElement.props.children);
    // 会把 newElement 的 props 赋值给 oldElement
    //!!! 复用老节点
    oldElement.props = newElement.props;
  } else if (oldElement.$$typeof === FUNCTION_COMPONENT) {
    updateFunctionComponent(oldElement, newElement);
  } else if (oldElement.$$typeof === CLASS_COMPONENT) {
    updateClassComponent(oldElement, newElement)
  }
}

function updateDOMProperties(dom, oldProps, newProps) {
  patchProps(dom, oldProps, newProps);
}

//! 更新步骤
// 1.拿到老元素
// 2.重新执行函数组件拿到新元素进行对比
function updateFunctionComponent(oldElement, newElement) {
  const oldRenderElement = oldElement.renderElement; // 获取老的渲染出来的元素
  const newRenderElement = newElement.type(newElement.props);
  const currentElement = compareTwoElement(oldRenderElement, newRenderElement);
  newElement.renderElement = currentElement; // 更新之后要重新挂载
}

//! 更新步骤
// 1.拿到老元素
// 2.重新执行类组件拿到新元素进行对比
function updateClassComponent(oldElement, newElement) {
  const componentInstance = newElement.componentInstance = oldElement.componentInstance; // 获取老的元素的类组件实例
  const updater = componentInstance.$updater;
  const newProps = newElement.props;
  if(oldElement.type.contextType) {
    componentInstance.context = oldElement.type.contextType.Provider.value;
  }
  // todo: old-lifecycle
  if(componentInstance.componentWillReceiveProps) {
    componentInstance.componentWillReceiveProps(newProps);
  }
  // todo: new-lifecycle
  if(newElement.type.getDerivedStateFromProps) {
    const prevState = componentInstance.state;
    const newState = newElement.type.getDerivedStateFromProps(newProps, prevState)
    if(newState) {
      componentInstance.state = {...componentInstance.state, ...newState};
    } else {
      // getDerivedStateFromProps 返回 null时，什么都不做
    }
  }
  updater.emitUpdate(newProps);
}

function updateChildrenElement(dom, oldChildrenElements, newChildrenElements) {
  updateDepth++; // 没进入一个新的子层级，就让 updateDepth++
  //! todo: 为什么需要打平？
  // const flattenOldChildrenElements = flatten(oldChildrenElements);  // 不是一个数组
  // const flattenNewChildrenElements = flatten(newChildrenElements);
  // diff(dom, flattenOldChildrenElements, flattenNewChildrenElements, diffQueue);
  diff(dom, oldChildrenElements, newChildrenElements, diffQueue);
  updateDepth--; // 每比较完一层，返回上一级的时候，就 updateDepth--
  if(updateDepth === 0) { // updateDepth等于0，说明回到了最上面一层了，整个更新对比就完事了
    patch(diffQueue); // 把收集到的差异补丁传给patch方法进行更新
    diffQueue.length = 0;
  }
}

//!!! todo:dom-diff
//! 1.先更新父节点还是先更新子节点？先更新的是父节点
//! 2.先移动父节点还是先移动子节点？先移动的是子节点
function diff(parentNode, oldChildrenElements, newChildrenElements) { // debugger
  const oldChildrenElementsMap = getChildrenElementsMap(oldChildrenElements);
  const newChildrenElementsMap = getNewChildrenElementsMap(oldChildrenElementsMap, newChildrenElements);
  let lastIndex = 0;
  //!!! 比较是深度优先的，所以先放子节点补丁，再放父节点补丁
  for (let i = 0; i < newChildrenElements.length; i++) {
    const newChildElement = newChildrenElements[i];
    if(newChildElement) {
      const newKey = newChildElement.key || i.toString();
      const oldChildElement = oldChildrenElementsMap.get(newKey);
      if(newChildElement === oldChildElement) { // 说明是同一个对象，是复用的老节点
        if(oldChildElement._mountIndex < lastIndex) {
          diffQueue.push({
            parentNode, // 要移除那个父节点下的元素
            type: MOVE,
            fromIndex: oldChildElement._mountIndex,
            toIndex: i
          })
        }
        lastIndex = Math.max(lastIndex, oldChildElement._mountIndex);
      } else { // 如果新老元素不相等，则直接插入
        diffQueue.push({
          parentNode,
          type: INSERT,
          toIndex: i,
          dom: createDOM(newChildElement)
        })
      }
      newChildElement._mountIndex = i; // 更新挂载索引
    } else {
      // todo: old-lifecycle
      const newKey = i.toString()
      const oldChildrenElement = oldChildrenElementsMap.get(newKey);
      if(oldChildrenElement.componentInstance && oldChildrenElement.componentInstance.componentWillUnmount) {
        oldChildrenElement.componentInstance.componentWillUnmount()
      }
    }
  }
  for (const [key, value] of oldChildrenElementsMap) {
    if(!newChildrenElementsMap.get(key)) {
      // console.log(key, value)
      diffQueue.push({
        parentNode,
        type: REMOVE,
        fromIndex: value._mountIndex,
      })
    }
  }
}

function getChildrenElementsMap(oldChildrenElements) {
  const oldChildrenElementsMap = new Map();
  for (let i = 0; i < oldChildrenElements.length; i++) {
    const oldChildElement = oldChildrenElements[i];
    const oldKey = oldChildElement.key || i.toString();
    oldChildrenElementsMap.set(oldKey, oldChildElement);
  }
  return oldChildrenElementsMap;
}

function getNewChildrenElementsMap(oldChildrenElementsMap, newChildrenElements) {
  const newChildrenElementsMap = new Map();
  for (let i = 0; i < newChildrenElements.length; i++) {
    const newChildElement = newChildrenElements[i];
    if(newChildElement) { // 说明新节点不为null
      const newKey = newChildElement.key || i.toString();
      const oldChildElement = oldChildrenElementsMap.get(newKey);
      //! 可以复用的条件
      // 1.key一样
      // 2.节点类型一样
      if(canDeepCompare(oldChildElement,newChildElement)) {
        //!!! 递归更新，复用老的DOM节点，用新的属性更新这个DOM节点
        //!!! 在此处递归，更新父元素的时候，会递归更细每一个子元素
        updateElement(oldChildElement, newChildElement);
        newChildrenElements[i] = oldChildElement; // 复用老的DOM节点
      }
      newChildrenElementsMap.set(newKey, newChildrenElements[i]);
    }
  }
  return newChildrenElementsMap;
}

function canDeepCompare(oldChildElement,newChildElement) {
  if(!!oldChildElement && !!newChildElement) {
    return oldChildElement.type === newChildElement.type; //如果类型一样，就可以复用了,就可以进行深度对比了
  }
  return false
}

//!!! 打补丁
//! 1.把需要移动和删除的全部删除
//! 2.把需要移动和新增的插入进来
function patch(diffQueue) {
  // console.log(JSON.stringify(diffQueue,null, 2))
  const deleteMap = new Map();
  const deleteChildren = [];
  for (let i = 0; i < diffQueue.length; i++) {
    const difference = diffQueue[i];
    const {type, fromIndex} = difference;
    if([MOVE, REMOVE].includes(type)) {
      const oldChildDOM = difference.parentNode.children[fromIndex]; // 获取老的dom节点
      deleteMap.set(fromIndex, oldChildDOM); // 为了后面方便复用，放到map里
      deleteChildren.push(oldChildDOM);
    }
  }
  // 把需要移动和删除的全部删除
  deleteChildren.forEach((childDOM) => {
    childDOM.parentNode.removeChild(childDOM);
  })
  for (let i = 0; i < diffQueue.length; i++) {
    const {type, fromIndex, toIndex, parentNode, dom} = diffQueue[i];
    switch (type) {
      case INSERT:
        insertChildAt(parentNode, dom, toIndex);
        break;
      case MOVE:
        insertChildAt(parentNode, deleteMap.get(fromIndex), toIndex);
        break;
      default:
        break;
    }
  }
}

// 向index这个索引位置插入
function insertChildAt(parentNode, newChildDom, index) {
  const oldChild = parentNode.children[index]; // 先取出这个索引位置的老的DOM节点
  oldChild ? parentNode.insertBefore(newChildDom, oldChild):parentNode.appendChild(newChildDom);
}
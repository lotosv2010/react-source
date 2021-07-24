import { addEvent } from "../events";

/**
 * 如果是数组，返回第一个元素，否则返回本身
 * @param {*} obj 
 * @returns 
 */
export function onlyOne(obj) {
  return Array.isArray(obj) ? obj[0] : obj;
}

/**
 * 给真实DOM节点添加属性
 * @param {dom节点} dom 
 * @param {属性对象} props 
 */
export function setProps(dom, props) {
  for (const key in props) {
    if(key !== 'children') {
      const value = props[key];
      setProp(dom, key, value);
    }
  }
} 

function setProp(dom, key, value) {
  // todo：如果说事件处理函数，新老属性对象都有，则删除老的监听，添加新的监听
  if(/^on/.test(key)) {
    // dom.addEventListener(key.toLowerCase().slice(2), value, false);
    addEvent(dom, key, value);
  } else if (key === 'style') {
    for (const styleName in value) {
      dom.style[styleName] = value[styleName];
    }
  } else {
    dom[key] = value;
  }
}

//! todo:
//! 1.老有新没有 ==> 删除
//! 2.老有新有  ==> 更新
//! 3.老没有新有 ==> 添加
export function patchProps(dom, oldProps, newProps) {
  for(let key in oldProps) {
    if(key !== 'children') { // 此处只处理自己的DOM属性，不处理 children 节点
      if(!newProps.hasOwnProperty(key)) { //! 老有新没有 ==> 删除
        dom.removeAttribute(key);
      }
    }
  }
  for(let key in oldProps) {
    if(key !== 'children') { // 此处只处理自己的DOM属性，不处理 children 节点
      setProp(dom, key, newProps[key]); //! 老没有新有 ==> 添加
    }
  }
}

// 打平一个任意的多维数组, 避免 Array.prototype.flat 深克隆
export function flatten(arr) {
  const flatted = [];
  (function flat(array) {
    array.forEach(i => {
      if(Array.isArray(i)) {
        flat(i)
      } else {
        flatted.push(i)
      }
    });
  })(arr);
  return flatted;
}

export function isFunction(obj) {
  return typeof obj === 'function';
}
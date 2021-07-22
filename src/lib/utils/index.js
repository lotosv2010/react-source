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
import { ELEMENT, TEXT } from "./constant";
import { ReactElement } from './vdom';

function createElement(type, config={}, ...children) {
  // if(config) {
  //   Reflect.deleteProperty(config, '__source')
  //   Reflect.deleteProperty(config, '__self')
  // }
  const {key, ref, ...props} = config;
  let $$typeof = null;
  if(typeof type === 'string') { // 是一个原声的DOM类型，如 div、span、button
    $$typeof = ELEMENT;
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
const React = {
  createElement
}
export default React
import {createDOM} from '../react/vdom';

function render(element, container) {
  // todo 1.要把虚拟 DOM 变成真实 DOM
  const dom = createDOM(element);
  // todo 2.把真实 DOM 挂载到 container 上
  container.appendChild(dom);
}
const ReactDOM = {
  render
}
export default ReactDOM
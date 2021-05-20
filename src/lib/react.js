import Component from './component'

// todo: lazy 动态路由
function lazy(load) {
  return class extends Component {
    state = {Comp: null}
    componentDidMount() {
      load().then(result => {
        this.setState({Comp: result.default || result})
      })
    }
    render() {
      const {Comp} = this.state
      return Comp? <Comp {...this.props} /> : null
    }
  }
}

// todo: Suspense
function Suspense(props) {
  return props.children? props.children : props.fallback
}
/**
 * 创建react元素
 * @param {元素类型} type 
 * @param {配置对象} config 
 * @param {子节点，无子节点时为 undefined ，一个子节点时为独生子，多个子节点时为第一个子节点 } children 
 */
export function createElement(type,config, children) {
  let ref
  if(config) {
    Reflect.deleteProperty(config, '__source')
    Reflect.deleteProperty(config, '__self')
    // todo:ref
    if(config.ref) {
      ref = config.ref
      // config.ref = {}
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
// todo:forwardRef函数组件ref实现
function forwardRef(FunctionComponent) {
  return class extends Component {
    render() {
      return FunctionComponent(this.props, this.props.ref)
    }
  }
}
const React = {
  createElement,
  Component,
  createRef,
  forwardRef,
  lazy,
  Suspense
}
export default React

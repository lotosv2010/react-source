import React, {Component} from 'react'
import RouterContext from './RouterContext'
import matchPath from './matchPath'
class Route extends Component {
  render() {
    return (
      <RouterContext.Consumer>
        {
          context => {
            const location = context.location // 拿到当前的地址信息
            const {component, computedMath, render} = this.props
            // 用location和当前的Route的path进行匹配得到匹配的结果
            // todo:如果computedMath属性有值，说明Switch组件已经匹配过了，这里就不需要再匹配了
            const match = computedMath ?? matchPath(location.pathname, this.props)
            const props = {...context, location, match}
            if(!match) return null
            let element
            if(component) {
              element = React.createElement(component, props)
            } else if(render) {
              element = render(props)
            } else {
              element = null
            }
            return (
              <RouterContext.Provider value={props}>
                {element}
              </RouterContext.Provider>
            )
          }
        }
      </RouterContext.Consumer>
    )
  }
}
export default Route
import React, {Component} from 'react'
import RouterContext from './RouterContext'
import matchPath from './matchPath'
class Switch extends Component {
  render() {
    return (
      <RouterContext.Consumer>
        {
          context => {
            const {location} = context
            let element, match
            React.Children.forEach(this.props.children, child => {
              if(!match && React.isValidElement(child)) {
                element = child
                // todo:兼容 Redirect
                const path = child.props.path || child.props.from
                const {pathname} = location
                // 当前地址栏中的路径和此子元素的路径进行匹配
                match = matchPath(pathname, {...child.props, path})
              }
            })
            return match ? React.cloneElement(element, {location, computedMath: match}) : null
          }
        }
      </RouterContext.Consumer>
    )
  }
}

export default Switch
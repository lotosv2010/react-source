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
              if(match == null && React.isValidElement(child)) {
                element = child
                const {path} = child.props
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
import React, {useContext} from 'react';
import { _RouterContext as RouterContext, matchPath} from '../react-router'
import Link from './Link'
export default function NavLink(props) {
  const context = useContext(RouterContext)
  const {location: {pathname}} = context
  const {
    className: classNameProp = '',       // 基础类名
    activeClassName = 'active', // 激活时的类名
    style: styleProp={}, // 基础样式对象
    activeStyle={}, // 激活时样式对象
    children,
    to,
    exact
  } = props
  const isActive = matchPath(pathname, {path: to,exact})
  const className = isActive ? joinClassName(classNameProp, activeClassName) : classNameProp
  const style = isActive ? {...styleProp, ...activeStyle} : styleProp
  const linkProps = {
    className,
    style,
    to,
    children
  }
  return <Link {...linkProps}/>
}

function joinClassName(...className) {
  return className.filter(i => i).join(' ')
}
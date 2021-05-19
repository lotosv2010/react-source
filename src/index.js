import React from 'react'
import ReactDOM from 'react-dom'
import {BrowserRouter as Router, Route, Switch, Redirect, NavLink} from './react-router-dom'
import Protected from './components/Protected'
import NavHeader from './components/NavHeader'
import Login from './components/Login'
import Home from './components/Home'
import User from './components//User'
import Profile from './components/Profile'
import Post from './components/Post'
import './index.css'

function App() {
  return(
    <Router>
      <div>
        <NavHeader title="Welcome React" />
        <ul>
          <li>
            <NavLink
              to='/home'
              activeClassName='active'
              className='strong'
              style={{textDecoration: 'underline'}}
              activeStyle={{color: 'red'}}
            >home</NavLink></li>
          <li>
            <NavLink
              to='/user'
              style={{textDecoration: 'underline'}}
              activeStyle={{color: 'red'}}
            >user</NavLink></li>
          <li>
            <NavLink
              to='/profile'
              style={{textDecoration: 'underline'}}
              activeStyle={{color: 'red'}}
            >mine</NavLink></li>
          <li>
            <NavLink
              to='/post/title'
              style={{textDecoration: 'underline'}}
              activeStyle={{color: 'red'}}
            >post</NavLink></li>
        </ul>
        <Switch>
          <Route path='/user' exact={false} component={User} />
          <Route path='/home' exact={true} component={Home} />
          <Route path='/login' exact={true} component={Login} />
          <Route path='/post/:title' exact={true} component={Post} />
          <Protected path='/profile' exact={true} component={Profile} />
          <Redirect from='/' to='/home' />
        </Switch>
      </div>
    </Router>
  )
}
/** 
 * todo:路由的三种渲染方式
 * 1.component，不能加逻辑
 * 2.render属性是一个函数，渲染函数的返回值
 * 3.children
 */

ReactDOM.render(
  <App />,
  document.getElementById('root')
)
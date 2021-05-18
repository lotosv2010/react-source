import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'
import {BrowserRouter as Router, Route, Switch, Redirect, Link, NavLink} from './react-router-dom'
import Protected from './components/Protected'
import Login from './components/Login'
import './index.css'

const Home = () => {
  return (
    <div> Home </div>
  )
}

const UserAdd = () => {
  return (
    <div> UserAdd </div>
  )
}

const UserList = () => {
  return (
    <div>
      <Link to={{pathname: `/user/detail/1001`, state: {id: '1001', username: 'test'}}}>userList</Link>
    </div>
  )
}

const UserDetail = (props) => {
  console.log(props)
  const user = props.location.state || {}
  const [state, setState] = useState({})
  const getInfo = () => {
    setState(user)
  }
  useEffect(() => {
    getInfo()
  })
  return (
    <div> id: {state.id}, username: {state.username} </div>
  )
}

const User = () => {
  return (
    <div>
      <ul>
        <li><Link to="/user/list">用户列表</Link></li>
        <li><Link to="/user/add">添加用户</Link></li>
      </ul>
      <div>
        <Route path="/user/add" component={UserAdd} />
        <Route path="/user/list" component={UserList} />
        <Route path="/user/detail/:id" component={UserDetail} />
      </div>
    </div>
  )
}

const Profile = () => {
  return (
    <div>
      Protected
    </div>
  )
}

function App() {
  return(
    <Router>
      <div>
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
        </ul>
        <Switch>
          <Route path='/user' exact={false} component={User} />
          <Route path='/home' exact={true} component={Home} />
          <Route path='/login' exact={true} component={Login} />
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
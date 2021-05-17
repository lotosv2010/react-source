import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'
import {BrowserRouter as Router, Route, Switch, Redirect, Link} from './react-router-dom'


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

function App() {
  return(
    <Router>
      <div>
        <ul>
          <li><Link to='/home'>home</Link></li>
          <li><Link to='/user'>user</Link></li>
        </ul>
        <Switch>
          <Route path='/user' exact={false} component={User} />
          <Route path='/home' exact={true} component={Home} />
          <Redirect from='/' to='/home' />
        </Switch>
      </div>
    </Router>
  )
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
)
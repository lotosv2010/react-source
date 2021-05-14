import React from 'react'
import ReactDOM from 'react-dom'
import {BrowserRouter as Router, Route, Switch} from './react-router-dom'


const Home = () => {
  return (
    <div> Home </div>
  )
}

const User = () => {
  return (
    <div> user </div>
  )
}

function App() {
  return(
    <Router>
      <div>
        <ul>
          {/* <li><Link to='/home'>home</Link></li>
          <li><Link to='/user'>user</Link></li> */}
        </ul>
        <Switch>
          <Route path='/user' component={User} />
          <Route path='/home' component={Home} />
          {/* <Redirect from='/' to='/home' /> */}
        </Switch>
      </div>
    </Router>
  )
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
)
import React from 'react'
import {Router} from '../react-router'
import {createBrowserHistory} from '../history'

const BrowserRouter = (props) => {
  const history = createBrowserHistory(props)
  return <Router history={history} children={props.children} />
}

export default BrowserRouter
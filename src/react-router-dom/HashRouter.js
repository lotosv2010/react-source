import React from 'react'
import {Router} from '../react-router'
import {createHashHistory} from '../history'

const HashRouter = (props) => {
  const history = createHashHistory(props)
  return <Router history={history} children={props.children} />
}

export default HashRouter
import React from 'react'
import RouterContext from './RouterContext'
import Lifecycle from './Lifecycle'
function Redirect({to, push = false}) {
  return (
    <RouterContext.Consumer>
      {
        context => {
          const {history} = context
          return (
            <Lifecycle
              onMount={() => history.push(to)}
              to={to}
            />
          )
        }
      }
    </RouterContext.Consumer>
  )
}

export default Redirect
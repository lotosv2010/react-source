import React from 'react';
import { _RouterContext as RouterContext} from '../react-router'
export default function Link(props) {
  return (
    <RouterContext.Consumer>
      {
        context => {
          const {history} = context
          return (
            <a
              {...props}
              onClick={event => {
                event.preventDefault()
                history.push(props.to)
              }}
            >
              {props.children}
            </a>
          )
        }
      }
    </RouterContext.Consumer>
  )
}
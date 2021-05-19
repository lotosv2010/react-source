import React from 'react'
import Lifecycle from './Lifecycle'
import RouterContext from './RouterContext'

function Prompt({when=true, message}) {
  return (
    <RouterContext.Consumer>
      {
        context => {
          // 如果 when 为 false，则表示不需要拦截（提示)
          if(!when) return null
          const block = context.history.block
          return (
            <Lifecycle
              onMount={lifecycleInstance => lifecycleInstance.release = block(message)}
              onUnmount={lifecycleInstance => lifecycleInstance.release()}
            />
          )
        }
      }
    </RouterContext.Consumer>
  )
}
export default Prompt
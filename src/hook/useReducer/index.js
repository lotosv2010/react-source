import React from 'react';
import ReactDOM from 'react-dom'
import './index.css'

// todo: useReducer
let lastState;
function useReducer(reducer, initialState) {
  lastState = lastState || initialState
  function dispatch(action) {
    if(reducer) {
      lastState = reducer(lastState, action)
    } else {
      lastState = action
    }
    
    render()
  }
  return [lastState, dispatch]
}

// todo: useState
// function useState(initialState) {
//   return useReducer(null, initialState)
// }

const reducer = (oldState, action) => {
  switch(action.type) {
    case 'add': 
      return {count: oldState.count + 1}
    case 'minus':
      return {count: oldState.count - 1}
    default: throw new Error()
  }
}
const init = {
  count: 0
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, init)
  return (
    <div>
      count: {state.count}
      <div>
        <p><button onClick={() => dispatch({type: 'add'})}>+</button></p>
        <p><button onClick={() => dispatch({type: 'minus'})}>-</button></p>
      </div>
    </div>
  )
}

function render() {
  ReactDOM.render(
    <Counter />,
    document.getElementById('root')
  )
}
render()
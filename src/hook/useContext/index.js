import React from 'react';
import ReactDOM from 'react-dom'
import './index.css'

const Context = React.createContext()

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

// todo: useContext
function useContext(Context) {
  console.dir(Context)
  return Context._currentValue
}

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
  const {state, dispatch} = useContext(Context)
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

function App() {
  const [state, dispatch] = useReducer(reducer, init)
  const value = {state, dispatch}
  return <Context.Provider value={value}>
    <Counter />
  </Context.Provider>
}

function render() {
  ReactDOM.render(
    <App />,
    document.getElementById('root')
  )
}
render()
// import React, { useState } from 'react'
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
// import React from './lib/react'
// import ReactDOM from './lib/react-dom'

let lastState

function useState(initialState) {
  let state = lastState || ((typeof initialState === 'function' && initialState()) || initialState)
  function setState(newState) {
    if(typeof newState === 'function') {
      lastState = newState(lastState)
    } else if (typeof newState === 'object'){
      if(Object.is(lastState, newState)) {
        return
      } else {
        lastState = newState
      }
    } else {
      lastState = newState
    }
    render()
  }
  return [state, setState]
}

function Counter(props) {
  console.log('render')
  const [counter, setCounter] = useState({name: '计数器', number: 0})
  return (
    <div>
      <div>{counter.name}</div>
      <div>{counter.number}</div>
      <button onClick={
        () => setCounter({...counter, number: counter.number + 1})
      }>
        +
      </button>
      <button onClick={
        () => setCounter(counter)
      }>
        -
      </button>
    </div>
  )
}
// const element = <Form />
// console.log(JSON.stringify(element, null, 2))

function render() {
  ReactDOM.render(
    <Counter />,
    document.getElementById('root')
  )
}
render()
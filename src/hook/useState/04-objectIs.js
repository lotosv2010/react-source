import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'

let lastState

function useState(initialState) {
  let state = lastState || ((typeof initialState === 'function' && initialState()) || initialState)
  function setState(newState) {
    if(typeof newState === 'function') {
      lastState = newState(lastState)
    } 
    if(!Object.is(lastState, newState)) {
      lastState = newState
      render()
    }
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

function render() {
  ReactDOM.render(
    <Counter />,
    document.getElementById('root')
  )
}
render()
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'

let lastState

function useState(initialState) {
  let state = lastState || initialState
  function setState(newState) {
    if(typeof newState === 'function') {
      lastState = newState(lastState)
    } else {
      lastState = newState
    }
    render()
  }
  return [state, setState]
}

export function Counter(props) {
  const [number, setNumber] = useState(0)
  return (
    <div>
      <div>{number}</div>
      <button onClick={
        () => setNumber(preNumber => preNumber * 2)
      }>
        set2
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
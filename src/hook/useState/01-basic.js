import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'

let lastState

function useState(initialState) {
  let state = lastState || initialState
  function setState(newState) {
    lastState = newState
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
        () => setNumber(number + 1)
      }>
        set
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
import React, { memo, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom'
import './index.css'

let hookStates = []
let hookIndex = 0
function useState(initialState) {
  hookStates[hookIndex] = hookStates[hookIndex] || ((typeof initialState === 'function' && initialState()) || initialState)
  const currentIndex = hookIndex
  function setState(newState) {
    if(typeof newState === 'function') {
      hookStates[currentIndex] = newState(hookStates[currentIndex])
    } 
    if(!Object.is(hookStates[currentIndex], newState)) {
      hookStates[currentIndex] = newState
      render()
    }
  }
  return [hookStates[hookIndex++], setState]
}

// todo:useCallback 减少函数创建
// todo:useMemo 减少对象创建
function Child({onButtonClick, data}) {
  console.log('Child render')
  return (
    <button onClick={onButtonClick}>{data.number}</button>
  )
}
// todo:memo 备忘录
const MemoChild = memo(Child) // Child

function Counter(props) {
  const [number, setNumber] = useState(0)
  const [name, setName] = useState('计数器')
  const addClick = useCallback(() => setNumber(number + 1), [number])
  const data = useMemo(() => ({number}), [number])
  return (
    <div>
      <input type='text' value={name} onChange={e => setName(e.target.value)} />
      <MemoChild onButtonClick={addClick} data={data} />
    </div>
  )
}

function render() {
  ReactDOM.render(
    <Counter />,
    document.getElementById('root')
  )
  hookIndex = 0
}
render()
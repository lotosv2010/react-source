import React, { memo } from 'react';
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
function useCallback(callback, deps) {
  if(hookStates[hookIndex]) {
    const [lastCallback, lastCallbackDeps] = hookStates[hookIndex]
    const same = deps.every((item, index) => item === lastCallbackDeps[index])
    if(same) { // 如果老的依赖和新的依赖都相同，则直接返回老的，如果又一个不相同，则返回新的
      hookIndex++
      return lastCallback
    } else {
      hookStates[hookIndex++] = [callback, deps]
      return callback
    }
  } else {
    hookStates[hookIndex++] = [callback, deps]
    return callback
  }
}

// todo:useMemo 减少对象创建
function useMemo(factory, deps) {
  if(hookStates[hookIndex]) {
    const [memo, lastDeps] = hookStates[hookIndex]
    const same = deps.every((item, index) => item === lastDeps[index])
    if(same) {
      hookIndex++
      return memo
    } else {
      const newMemo = factory()
      hookStates[hookIndex++] = [newMemo, deps]
      return newMemo
    }
  } else {
    const newMemo = factory()
    hookStates[hookIndex++] = [newMemo, deps]
    return newMemo
  }
}


function Child({onButtonClick1, data1, onButtonClick2, data2}) {
  console.log('Child render')
  return (
    <>
      <button onClick={onButtonClick1}>{data1.number}</button>
      <button onClick={onButtonClick2}>{data2.number}</button>
    </>
  )
}
// todo:memo 备忘录
const MemoChild = memo(Child) // Child

function Counter(props) {
  // 如果一旦进入函数组件，索引先归为0
  // 每调用一个hook，索引会加1
  const [number, setNumber] = useState(0)
  const [name, setName] = useState('计数器')
  const addClick1 = useCallback(() => setNumber(number + 1), [number])
  const addClick2 = useCallback(() => setNumber(number + 1), [number])
  const data1 = useMemo(() => ({number}), [number])
  const data2 = useMemo(() => ({number: -number}), [number])
  return (
    <div>
      <input type='text' value={name} onChange={e => setName(e.target.value)} />
      <MemoChild onButtonClick1={addClick1} data1={data1} onButtonClick2={addClick2} data2={data2} />
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
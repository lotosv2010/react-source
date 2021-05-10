import React, {useState} from 'react';
// import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
// import React from './lib/react'
// import ReactDOM from './lib/react-dom'


// todo: useRef
let lastRef
function useRef(initialRef = {current: null}) {
  lastRef = lastRef || initialRef
  return lastRef
}

/**
 * useRef 返回一个可变的ref对象，current 属性初始化为传入的参数
 * 返回的ref对象在组件的整个生命周期内保持不变
 */
 function Counter() {
  const [number, setNumber] = useState(0)
  const handleClick = () => {
    setNumber(number + 1)
  }
  return (
    <div>
      <p>{number}</p>
      <Child value={number} />
      <button onClick={handleClick}>add</button>
    </div>
  )
}

function Child(props) {
  const inputRef = useRef()
  const onfocus =() => {
    inputRef.current.focus()
  }
  return (
    <div>
      <input type="text" ref={inputRef} defaultValue={props.value} />
      <button onClick={onfocus}>获取焦点</button>
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
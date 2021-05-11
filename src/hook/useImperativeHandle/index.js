import React, {useState, useRef, forwardRef} from 'react';
import ReactDOM from 'react-dom'
import './index.css'


// todo: useImperativeHandle

function useImperativeHandle(forwardRef, factory) {
  forwardRef.current = factory()
  console.log(forwardRef)
}

function Child(props, forwardRef) {
  const inputRef = useRef()
  // 1.参数是转发的forwardRef对象
  // 2.是一个工厂函数，返回的是一个对象
  useImperativeHandle(forwardRef, () => ({
    focus: () => {
      inputRef.current.focus()
    }
  }))
  return (
    <div>
      <input type="text" ref={inputRef} defaultValue={props.value} />
    </div>
  )
}

const ForwardChild = forwardRef(Child)

function Counter() {
  const [number, setNumber] = useState(0)
  const handleClick = () => {
    setNumber(number + 1)
  }
  const childRef = useRef()
  const getFocus =() => {
    childRef.current.focus()
    // childRef.current.parentNode.removeChild(childRef.current) // 报错
  }
  return (
    <div>
      <p>{number}</p>
      <ForwardChild value={number} ref={childRef} />
      <button onClick={getFocus}>获取焦点</button>
      <button onClick={handleClick}>add</button>
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
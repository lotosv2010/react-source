import React, {useState} from 'react';
import ReactDOM from 'react-dom'
import './index.css'

// todo: useEffect
let lastDep
let destroy
function useEffect(callback, dep) {
  console.log(lastDep)
  if(lastDep) {
    if(lastDep !== dep) {
      destroy()
      destroy = callback()
      lastDep = dep
    }
  } else {
    destroy&&destroy()
    destroy = callback()
    lastDep = dep
  }
}
function Counter() {
  const [state, setState] = useState(0)
  // 这个钩子，它会在每次页面渲染后执行，包括首次渲染和每次更新结束
  useEffect(() => {
    const timer = setInterval(() => {
      setState(state => state + 1)
    }, 1000);
    
    // 销毁函数，会在每次重新渲染之前执行
    return () => {
      clearInterval(timer)
    }
  })

  return (
    <div>
      {state}
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
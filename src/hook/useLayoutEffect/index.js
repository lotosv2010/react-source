import React, {useRef} from 'react';
import ReactDOM from 'react-dom'
import './index.css'
// todo: useEffect
function useEffect(callback) {
  // 直接把callback放在宏任务队列中
  setTimeout(callback)
}
// todo: useLayoutEffect
function useLayoutEffect(callback) {
  // 直接把callback放在then中，then的回调是一个微任务，会在页面渲染或绘制前执行
  // Promise.resolve().then(callback)
  // todo: 参考https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_DOM_API/Microtask_guide
  queueMicrotask(callback)
}

function Animation() {
  const ref = useRef()
  useEffect(() => {
    ref.current.style.transform = 'translateX(500px)'
    ref.current.style.transition = 'all 500ms'
  })

  useLayoutEffect(() => {
    ref.current.style.transform = 'translateY(500px)'
    ref.current.style.transition = 'all 500ms'
  })
  const styleObj = {
    width: 100,
    height: 100,
    backgroundColor: 'red'
  }
  return (
    <div>
      <div style={styleObj} ref={ref}></div>
    </div>
  )
}

function render() {
  ReactDOM.render(
    <Animation />,
    document.getElementById('root')
  )
}
render()
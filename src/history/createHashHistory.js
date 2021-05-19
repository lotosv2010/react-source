/**
 * @description
 * @author gwb
 * @date 2021-05-12 10:43:26
 */

function createHashHistory() {
  const globalHistory = window.history
  let listeners = []
  let prompt
  const state = globalHistory.state || {}
  function setState(nextState) {
    Object.assign(history, nextState)
    history.length = globalHistory.length
    listeners.forEach(listen => listen(history))
  }
  window.addEventListener('hashchange', () => {
    const pathname = window.location.hash.slice(1)
    setState({location: {...state, pathname}})
  })
  function push(path) {
    const action = 'PUSH'
    let pathname, state
    if(typeof path === 'string') {
      pathname = path
    } else if(typeof path === 'object') {
      pathname = path.pathname
      state = path.state
    }
    // todo:Prompt，劫持push跳转
    if(prompt) {
      const message = prompt({pathname, state})
      const result = window.confirm(message)
      if(!result) return
    }
    const location = { pathname, state}
    window.location.hash = pathname
    setState({action, location})
  }
  const history = {
    length: globalHistory.length,
    action: 'POP',
    location: {
      pathname: window.location.pathname,
      state
    },
    push,
    listen(listener) {
      listeners.push(listener);
      // 监听函数会返回一个取消监听的函数
      return function () {
        listeners = listeners.filter(item => item !== listener)
      }
    },
    block(message) {
      prompt = message
      return () => prompt = null
    }
  }
  return history
}
export default createHashHistory
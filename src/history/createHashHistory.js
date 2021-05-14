/**
 * @description
 * @author gwb
 * @date 2021-05-12 10:43:26
 */

function createHashHistory() {
  const globalHistory = window.history
  let listeners = []
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
    }
  }
  return history
}
export default createHashHistory
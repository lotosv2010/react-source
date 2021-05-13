/**
 * @description
 * @author gwb
 * @date 2021-05-12 10:43:26
 */

function createHashHistory() {
  const globalHistory = window.history
  const listeners = []
  const state = globalHistory.state || {}
  function setState(nextState) {
    Object.assign(history, nextState)
    history.length = globalHistory.length
    listeners.forEach(listen => listen())
  }
  window.addEventListener('hashchange', () => {
    const pathname = window.location.hash.slice(1)
    setState({...state, pathname})
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
    window.location.hash = pathname
    const location = { pathname, state}
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
      return listeners.push(listener);
    }
  }
  return history
}
export default createHashHistory
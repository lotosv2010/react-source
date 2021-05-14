/**
 * @description
 * @author gwb
 * @date 2021-05-12 10:43:26
 */
/*
 {
  "action": "POP",
  "location": {
      "pathname": "/user",
      "search": "",
      "hash": "",
      "state": null,
      "key": "default"
  },
  back: ƒ (),
  block: ƒ (a),
  createHref: ƒ g(a),
  forward: ƒ (),
  go: ƒ r(a),
  listen: ƒ (a),
  push: ƒ w(a, d),
  replace: ƒ u(a, d),
  get action: ƒ action(),
  get location: ƒ location(),
  __proto__: Object
}
*/

function createBrowserHistory() {
  const globalHistory = window.history
  let listeners = []
  function go(delta) {
    globalHistory.go(delta)
  }
  function setState(nextState) {
    Object.assign(history, nextState)
    history.length = globalHistory.length
    listeners.forEach(listen => listen())
  }
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
    globalHistory.pushState(state, null, path)
    setState({action, location})
  }
  const history = {
    length: globalHistory.length,
    action: 'POP',
    location: {
      pathname: window.location.pathname,
      state: globalHistory.state
    },
    go,
    back() {
      go(-1)
    },
    forward() {
      go(1)
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
export default createBrowserHistory
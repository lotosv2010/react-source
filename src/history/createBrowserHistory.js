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
  let prompt
  function go(delta) {
    globalHistory.go(delta)
  }
  function setState(nextState) {
    Object.assign(history, nextState)
    history.length = globalHistory.length
    listeners.forEach(listen => listen(nextState))
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
    // todo:Prompt，劫持push跳转
    if(prompt) {
      const message = prompt({pathname, state})
      const result = window.confirm(message)
      if(!result) return
    }
    const location = { pathname, state}
    globalHistory.pushState(state, null, pathname)
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
    },
    block(message) {
      prompt = message
      return () => prompt = null
    }
  }
  return history
}
export default createBrowserHistory
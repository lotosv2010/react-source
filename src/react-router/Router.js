import React, {Component} from 'react'
import RouterContext from './RouterContext'
class Router extends Component {
  constructor(props) {
    super(props)
    this.state = {
      location: props.history.location // 当前的路径
    }
    // todo:路径发生变化的时候，重新刷新Router组件，让里面的组件重新渲染
    this.unListen = this.props.history.listen(({location}) => {
      this.setState({location})
    })
  }
  
  componentWillUnmount() {
    this.unListen()
  }
  render() {
    const value = {
      history: this.props.history,  // 历史对象
      location: this.state.location // 路径
    }
    return (
      <RouterContext.Provider value={value}>
        {this.props.children}
      </RouterContext.Provider>
    )
  }
}
export default Router
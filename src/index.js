// import React from 'react'
// import ReactDOM from 'react-dom'
import './index.css'
import React from './lib/react'
import ReactDOM from './lib/react-dom'

class ScrollList extends React.Component {
  constructor(props) {
    super(props)
    this.wrapper = React.createRef()
    this.state = {message: []}
    console.log('1.constructor')
  }
  // todo:mounting
  // todo:根据新的属性对象得到新的状态对象，它是一个静态方法
  static getDerivedStateFromProps(nextProps, nextState) {
    console.log('2.getDerivedStateFromProps', nextProps, nextState)
    return {...nextState, name: `lifecycle-${nextState.message.length}`}
  }
  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState({
        message: [`${this.state.message.length}`, ...this.state.message]
      })
    }, 1000);
  }

  // todo:updation
  shouldComponentUpdate() {
    console.log(`3.shouldComponentUpdate`)
    return true
  }
  getSnapshotBeforeUpdate() {
    console.log(`5.getSnapshotBeforeUpdate`)
    return {
      prevScrollTop: this.wrapper.current.scrollTop, // 老的向上卷去的高度
      prevScrollHeight: this.wrapper.current.scrollHeight // 老的内容的高度
    }
  }
  componentDidUpdate(prevProps, prevState, {prevScrollTop, prevScrollHeight}) {
    console.log(`6.componentDidUpdate`)
    const wrapper = this.wrapper.current
    console.log(prevScrollTop, prevScrollHeight)
    wrapper.scrollTop = prevScrollTop + (wrapper.scrollHeight - prevScrollHeight)
  }

  // todo:unmounting
  componentWillUnmount() {
    console.log(`7.componentWillUnmount`)
    clearInterval(this.timer)
  }
  render() {
    console.log(`4.render`)
    const styleObj = {
      height: '100px',
      width: '200px',
      border: '1px solid red',
      overflow: 'auto'
    }
    return (
      <div style={styleObj} ref={this.wrapper}>
        {
          this.state.message.map((msg, index) => {
            return <p key={index}><span>{msg}</span></p>
          })
        }
      </div>
    )
  }
}

// const element = <Form />
// console.log(JSON.stringify(element, null, 2))

ReactDOM.render(
  <ScrollList />,
  document.getElementById('root')
)


// import React from 'react'
// import ReactDOM from 'react-dom'
import './index.css'
import React from './lib/react'
import ReactDOM from './lib/react-dom'

class LifecycleDemo extends React.Component {
  // todo:initialization
  static defaultProps = { // 初始化默认属性对象
    name: 'lifecycle'
  }
  constructor(props) {
    super(props)
    this.state = {number: 0}
    console.log(`1.LifecycleDemo-constructor`)
  }
  
  // todo:mounting
  componentWillMount() {
    console.log(`2.LifecycleDemo-componentWillMount`)
  }
  componentDidMount() {
    console.log(`4.LifecycleDemo-componentDidMount`)
  }

  // todo:updation
  componentWillReceiveProps() {
    console.log(`5.LifecycleDemo-componentWillReceiveProps`)
  }
  shouldComponentUpdate(nextProps,nextState) {
    console.log(`6.LifecycleDemo-shouldComponentUpdate`)
    return nextState.number % 2 === 0
  }
  componentWillUpdate() {
    console.log(`7.LifecycleDemo-componentWillUpdate`)
  }
  componentDidUpdate() {
    console.log(`8.LifecycleDemo-componentDidUpdate`)
  }

  // todo:unmounting
  componentWillUnmount() {
    console.log(`9.LifecycleDemo-componentWillUnmount`)
  }


  // todo:render
  handleClick = (event) => {
    this.setState({number: this.state.number + 1})
  }
  render() {
    console.log(`3.LifecycleDemo-render`)
    return (
      <div>
        <h1>{this.props.name}</h1>
        <p>{this.state.number}</p>
        <button onClick={this.handleClick}>add</button>
      </div>
    )
  }
}

// const element = <Form />
// console.log(JSON.stringify(element, null, 2))

ReactDOM.render(
  <LifecycleDemo />,
  document.getElementById('root')
)


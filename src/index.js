// import React from 'react'
// import ReactDOM from 'react-dom'
import './index.css'
import React from './lib/react'
import ReactDOM from './lib/react-dom'
class ClassComponent extends React.Component{
  constructor(props) {
    super(props)
    this.state = {number: 0}
  }
  handleClick = (e) => {
    debugger
    // 在React事件和生命周期函数中更新是批量的或者是异步的
    // 在setTimeout原生事件是同步的
    this.setState(prevState => ({number: prevState.number + 1}))
    console.log(this.state.number) // 0
    this.setState(prevState => ({number: prevState.number + 1}))
    console.log(this.state.number) // 0
    this.setState({number: this.state.number + 1})
    console.log(this.state.number) // 0
    this.setState({number: this.state.number + 1})
    console.log(this.state.number) // 0
    setTimeout(() => {
      this.setState({number: this.state.number + 1})
      console.log(this.state.number)// 2
    }, 1000);

    // this.setState({number: this.state.number + 1})
    // console.log(this.state.number) // 0
    // this.setState({number: this.state.number + 1})
    // console.log(this.state.number) // 0
    // this.setState(prevState => ({number: prevState.number + 1}))
    // console.log(this.state.number) // 0
    // this.setState(prevState => ({number: prevState.number + 1}))
    // console.log(this.state.number) // 0
    // setTimeout(() => {
    //   this.setState({number: this.state.number + 1})
    //   console.log(this.state.number)// 4
    // }, 1000);
  }
  render() {
    return (
      <div className='app' style={{color: 'red'}} onClick={this.handleClick}>
        <span>{this.props.name}</span>
        {this.props.children}
        {this.state.number}
      </div>
    )
  }
}

const element = <ClassComponent name='hello'> world</ClassComponent>

// console.log(JSON.stringify(element, null, 2))

ReactDOM.render(
  element,
  document.getElementById('root')
)


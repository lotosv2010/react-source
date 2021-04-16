// import React from 'react'
// import ReactDOM from 'react-dom'
import './index.css'
import React from './lib/react'
import ReactDOM from './lib/react-dom'

class Form extends React.Component{
  constructor() {
    super()
    this.formInput = React.createRef()
  }
  getFocus = () => {
    //  todo:this.formInput.current 是 TextInput 组件实例
    this.formInput.current.getFocus()
  }
  render() {
    return (
      <div>
        <TextInput ref={this.formInput}/>
        <button onClick={this.getFocus}>获取焦点</button>
      </div>
    )
  }
}

class TextInput extends React.Component {
  constructor() {
    super()
    this.input = React.createRef()
  }
  getFocus = () => {
    this.input.current.focus()
  }
  render() {
    return (
      <input ref={this.input} />
    )
  }
}

const element = <Form name='hello'> world</Form>

// console.log(JSON.stringify(element, null, 2))

ReactDOM.render(
  element,
  document.getElementById('root')
)


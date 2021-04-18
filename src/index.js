// import React from 'react'
// import ReactDOM from 'react-dom'
import './index.css'
import React from './lib/react'
import ReactDOM from './lib/react-dom'

const TextInput = React.forwardRef((props, ref) => {
  return <input ref={ref}/>
})

class Form extends React.Component{
  constructor() {
    super()
    this.formInput = React.createRef()
  }
  getFocus = () => {
    //  todo:this.formInput.current 是 TextInput 组件实例
    this.formInput.current.focus()
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

// const element = <Form />
// console.log(JSON.stringify(element, null, 2))

ReactDOM.render(
  <Form />,
  document.getElementById('root')
)


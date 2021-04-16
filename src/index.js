// import React from 'react'
// import ReactDOM from 'react-dom'
import './index.css'
import React from './lib/react'
import ReactDOM from './lib/react-dom'
class ClassComponent extends React.Component{
  // todo: ref 引用的意思
  // refs:提供了一种允许我们访问的DOM元素的方式
  // ref:值是一个字符串，此方式已废弃
  // ref:值是一个函数，此方式已废弃
  // ref:值是一个对象，对象的current属性指向真实的DOM元素
  constructor(props) {
    super(props)
    this.a = React.createRef()
    this.b = React.createRef()
    this.result = React.createRef()
  }
  add = () => {
    const a = this.a.current.value
    const b = this.b.current.value
    this.result.current.value = a + b
  }
  render() {
    return (
      <div>
        <input ref={this.a}/> + <input ref={this.b}/><span onClick={this.add}>=</span><input disabled ref={this.result}/>
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


// import React from 'react'
// import ReactDOM from 'react-dom'
import './index.css'
import React from './lib/react'
import ReactDOM from './lib/react-dom'
class ClassComponent extends React.Component{
  handleClick = (e) => {
    console.log('click', e)
  }
  render() {
    return (
      <div className='app' style={{color: 'red'}} onClick={this.handleClick}>
        <span>{this.props.name}</span>
        {this.props.children}
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


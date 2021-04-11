// import React from 'react'
// import ReactDOM from 'react-dom'
import './index.css'
import React from './lib/react'
import ReactDOM from './lib/react-dom'

function FuncComponent(props) {
  return (
    <div className='app' style={{color: 'red'}}>
      <span>{props.name}</span>
      {props.children}
    </div>
  )
}

const element = <FuncComponent name='hello'> world</FuncComponent>

console.log(JSON.stringify(element, null, 2))

ReactDOM.render(
  element,
  document.getElementById('root')
);


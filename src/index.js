// import React from 'react';
// import ReactDOM from 'react-dom';
import './index.css';
import React from './lib/react'
import ReactDOM from './lib/react-dom'

const element = React.createElement('h1',
  { className: 'app', style: {color: 'red'}},
  React.createElement('span', null, 'hello'),
  ' world'
)


console.log(JSON.stringify(element, null, 2))

ReactDOM.render(
  element,
  document.getElementById('root')
);


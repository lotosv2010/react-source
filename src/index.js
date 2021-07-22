import React, {Component, createElement} from './lib/react/index';
import ReactDOM from './lib/react-dom/index';
// import React, {Component, createElement} from 'react';
// import ReactDOM from 'react-dom';
import './index.css';

class ClassComponent extends Component {
  render() {
    return createElement('div', {id: 'counter'}, 'hello')
  }
}

function FunctionComponent(props) {
  console.log(props)
  const {style, children} = props
  return createElement('div', {style, id: 'counter'}, 'hello', children)
}

const element1 = createElement('div', {id: 'counter'}, 'hello');
const element2 = createElement(ClassComponent);
const element3 = createElement(FunctionComponent);
const element4 = createElement(FunctionComponent, {style:{color: 'red'}}, ' world')
console.log(element1, element2, element3)
ReactDOM.render(
  <>
    {element1}
    {element2}
    {element3}
    {element4}
  </>,
  document.getElementById('root')
);


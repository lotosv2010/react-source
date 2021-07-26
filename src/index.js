import React, {Component, createElement} from './lib/react/index';
import ReactDOM from './lib/react-dom/index';
// import React, {Component, createElement} from 'react';
// import ReactDOM from 'react-dom';
import './index.css';

class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = {show: true}
  }
  // 在React中进行事件处理函数执行的时候，会进入批量更新模式
  // 在执行此函数的时候，可能会引起多个组件的更新，但是因为当前是处于批量更新模式的
  // 不会立即更新state，而是会把这个状态存起来，在事件函数执行完成后在全部更新这个脏组件
  handleClick = () => {
    this.setState((state) => ({show: !state.show}))
  }
  render() {
    return createElement(FCCounter, {show: this.state.show, onClick: this.handleClick})
  }
}

function FCCounter(props) {
  const {onClick} = props
  if(props.show) {
    return createElement(
      'ul', {id: `ul`, onClick},
      createElement('li', {key: 'A'}, 'A'),
      createElement('li', {key: 'B'}, 'B'),
      createElement('li', {key: 'C'}, 'C'),
      createElement('li', {key: 'D'}, 'D'),
    )
  } else {
    return createElement(
      'ul', {id: `ul`, onClick},
      createElement('li', {key: 'A'}, 'A'),
      createElement('li', {key: 'C'}, 'C'),
      createElement('li', {key: 'B'}, 'B'),
      createElement('li', {key: 'E'}, 'E'),
      createElement('li', {key: 'F'}, 'F'),
    )
  }
}

const element = createElement(Counter)

ReactDOM.render(
  <>
    {element}
  </>,
  document.getElementById('root')
);
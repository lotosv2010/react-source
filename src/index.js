import React, {Component, createElement} from './lib/react/index';
import ReactDOM from './lib/react-dom/index';
// import React, {Component, createElement} from 'react';
// import ReactDOM from 'react-dom';
import './index.css';

class Counter extends Component {
  static defaultProps = {name: 'test'}
  constructor(props) {
    super(props);
    this.state = {number: 2}
  }
  handleClick = () => {
    this.setState((state) => ({number: state.number+1}))
  }
  render() {
    return createElement('div', {},
      createElement('p', {}, this.state.number),
      createElement(ChildCounter, {number: this.state.number}),
      createElement('button', {onClick: this.handleClick}, '+')
    )
  }
}

class ChildCounter extends Component {
  constructor(props) {
    super(props);
    this.state = {number: 0}
  }
  // 从新的属性对象中派生state状态
  static getDerivedStateFromProps(nextProps, prevState) {
    const {number} = nextProps;
    if(number % 2 === 0) {
      return {number: number * 2} // 偶数*2
    } else {
      return {number: number * 3} // 奇数*3
    }
    // 否则，对于state不进行任何操作
    // return null;
  }
  render() {
    return createElement('div', {}, this.state.number)
  }
}

const element = createElement(Counter)

ReactDOM.render(
  <>
    {element}
  </>,
  document.getElementById('root')
);
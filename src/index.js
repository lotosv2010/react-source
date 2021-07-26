import React, {Component, createElement} from './lib/react/index';
import ReactDOM from './lib/react-dom/index';
// import React, {Component, createElement} from 'react';
// import ReactDOM from 'react-dom';
import './index.css';

class Counter extends Component {
  static defaultProps = {name: 'test'}
  constructor(props) {
    super(props);
    this.state = {number: 0}
    console.log('Counter constructor');
  }
  componentWillMount() {
    console.log('Counter componentWillMount');
  }
  componentDidMount() {
    console.log('Counter componentDidMount');
  }
  shouldComponentUpdate(nextProps, nextState) {
    console.log('Counter shouldComponentUpdate');
    return nextState.number > 1;
  }
  componentWillUpdate() {
    console.log('Counter componentWillUpdate');
  }
  componentDidUpdate() {
    console.log('Counter componentDidUpdate');
  }
  componentWillUnmount() {
    console.log('Counter componentWillUnmount');
  }
  componentWillReceiveProps(nextProps) {
    console.log('Counter componentWillReceiveProps', nextProps);
  }
  handleClick = () => {
    this.setState((state) => ({number: state.number+1}))
  }
  render() {
    console.log('Counter render');
    return createElement('div', {},
      createElement('p', {}, this.state.number),
      this.state.number > 3? null : createElement(ChildCounter, {number: this.state.number}),
      createElement('button', {onClick: this.handleClick}, '+')
    )
  }
}

class ChildCounter extends Component {
  constructor(props) {
    super(props);
    console.log('ChildCounter constructor');
  }
  componentWillMount() {
    console.log('ChildCounter componentWillMount');
  }
  componentDidMount() {
    console.log('ChildCounter componentDidMount');
  }
  shouldComponentUpdate(nextProps, nextState) {
    console.log('ChildCounter shouldComponentUpdate');
    return nextProps.number > 2;
  }
  componentWillUpdate() {
    console.log('ChildCounter componentWillUpdate');
  }
  componentDidUpdate() {
    console.log('ChildCounter componentDidUpdate');
  }
  componentWillReceiveProps(nextProps) {
    console.log('ChildCounter componentWillReceiveProps', nextProps);
  }
  componentWillUnmount() {
    console.log('ChildCounter componentWillUnmount');
  }
  render() {
    console.log('Counter render');
    return createElement('div', {}, this.props.number)
  }
}

const element = createElement(Counter)

ReactDOM.render(
  <>
    {element}
  </>,
  document.getElementById('root')
);
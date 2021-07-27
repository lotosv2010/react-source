import React, {Component, createElement} from './lib/react/index';
import ReactDOM from './lib/react-dom/index';
// import React, {Component, createElement} from 'react';
// import ReactDOM from 'react-dom';
import './index.css';

const ThemeContext = React.createContext()

class GrandSon1 extends Component {
  // 如果说你给一个类组件增加了一个静态属性 contextType
  // 那么就可以通过 this.context这个属性来获取 provider 里面的 value
  static contextType = ThemeContext
  render() {
    return createElement('div', {style: {margin: '10px', border: `5px solid ${this.context.color}`, padding: '5px'}}, 'GrandSon1')
  }
}
class GrandSon2 extends React.Component {
  static contextType = ThemeContext
  render() {
    return createElement('div', {style: {margin: '10px', border: `5px solid ${this.context.color}`, padding: '5px'}}, 'GrandSon2')
  }
}

class Child1 extends React.Component {
  static contextType = ThemeContext
  render() {
    return createElement('div', {style: {margin: '10px', border: `5px solid ${this.context.color}`, padding: '5px'}}, 'Child1', createElement(GrandSon1))
  }
}
class Child2 extends React.Component {
  static contextType = ThemeContext
  render() {
    return createElement('div', {style: {margin: '10px', border: `5px solid ${this.context.color}`, padding: '5px'}}, 'Child2', createElement(GrandSon2))
  }
}
class Page extends React.Component {
  constructor(props) {
    super(props)
    this.state = {color: 'red'}
  }
  changeColor = (color) => {
    this.setState({color})
  }
  render() {
    const value = {
      color: this.state.color,
      changeColor: this.changeColor
    }
    const onClick = () => {
      const color = this.state.color === 'red' ? 'green' : 'red'
      this.changeColor(color)
    }
    return createElement(ThemeContext.Provider, {value},
      createElement('div', 
        {style: {margin: '10px', border: `5px solid ${this.state.color}`, padding: '5px', width: '200px'}},
        createElement(Child1),
        createElement(Child2),
        createElement('button', {onClick}, 'changeColor')
      )
    )
  }
}

const element = createElement(Page)

ReactDOM.render(
  <>
    {element}
  </>,
  document.getElementById('root')
);
import React, {Component, createElement} from './lib/react/index';
import ReactDOM from './lib/react-dom/index';
// import React, {Component, createElement} from 'react';
// import ReactDOM from 'react-dom';
import './index.css';

class ScrollingList extends Component {
  wrapper
  timeID
  constructor(props) {
    super(props);
    this.state = {messages: []}
    // this.wrapper = React.createRef();
  }
  addMessage = () => {
    this.setState((state) => ({messages: [`${this.state.messages.length}`, ...state.messages]}))
  }
  componentDidMount() {
    this.timeID = window.setInterval(() => {
      this.addMessage();
    }, 3000)
  }
  componentWillUnmount() {
    window.clearInterval(this.timeID);
  }
  getSnapshotBeforeUpdate = () => {
    // return this.wrapper.current.scrollHeight;
    return 100
  }
  componentDidUpdate(prevProps, prevState, prevScrollHeight) {
    // const curScrollTop = this.wrapper.current.scrollTop; // 当前卷去的高度
    console.log(prevProps,prevState,  prevScrollHeight)
    // 当前卷去的高度加上增加的高度
    // this.wrapper.current.scrollTop = curScrollTop + (this.wrapper.current.scrollHeight - prevScrollHeight)
  }
  render() {
    const style = {
      height: '100px',
      width: '200px',
      border: '1px solid red',
      overflow: 'auto'
    }
    return createElement('div', {style, ref: this.wrapper},
      this.state.messages.map((m, index) => (createElement('div', {key: index}, m)))
    )
  }
}

const element = createElement(ScrollingList)

ReactDOM.render(
  <>
    {element}
  </>,
  document.getElementById('root')
);
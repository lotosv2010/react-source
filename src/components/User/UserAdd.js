import React, {Component} from 'react';
class Login extends Component {
  constructor(props) {
    super(props)
    this.state = {name: '', id: -1}
  }
  handleChange = (e) => {
    const id = Math.floor(Math.random() * 1000000)
    this.setState({name: e.target.value, id})
  }
  handleClick = () => {
    if(!this.state.name) return alert('请输入用户名')
    const users = JSON.parse(localStorage.getItem('users')) || []
    const user = this.state
    localStorage.setItem('users', JSON.stringify([...users, user]))
  }
  render() {
    return (
      <div>
        <p>用户名：<input value={this.state.name} onChange={this.handleChange} /></p>
        <button onClick={this.handleClick}>add</button>
      </div>
    )
  }
}
export default Login
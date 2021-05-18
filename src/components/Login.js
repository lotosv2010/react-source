import React, {Component} from 'react';
class Login extends Component {
  handleClick = () => {
    localStorage.setItem('login', 'true')
    if(this.props.location.state) {
      this.props.history.push(this.props.location.state.from)
    }
  }
  render() {
    return (
      <button onClick={this.handleClick}>login</button>
    )
  }
}
export default Login
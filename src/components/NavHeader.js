import React, { Component } from 'react'
import {withRouter} from '../react-router-dom'

class NavHeader extends Component {
  render() {
    return (
      <h1 onClick={() => {
        this.props.history.push('/')
      }}>
        {this.props.title}
      </h1>
    )
  }
}
export default withRouter(NavHeader)

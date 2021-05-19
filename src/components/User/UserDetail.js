import React, {useEffect, useState} from 'react';
const UserDetail = (props) => {
  console.log(props)
  const user = props.location.state || {}
  const [state, setState] = useState({})
  const getInfo = () => {
    setState(user)
  }
  useEffect(() => {
    getInfo()
  })
  return (
    <div> id: {state.id}, username: {state.name} </div>
  )
}
export default UserDetail
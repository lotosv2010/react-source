import React from 'react';
import {useParams, useHistory, useLocation} from '../../react-router-dom'
const Post = () => {
  const {title} = useParams()
  const location = useLocation()
  const history = useHistory()
  return (
    <div>
      <p>title:{title} </p>
      <p>location:{JSON.stringify(location, null, 2)} </p>
      <p><button onClick={() => history.push('/home')}>去首页</button></p>
    </div>
  )
}
export default Post
import React from 'react';
import {Link} from '../../react-router-dom'
const UserList = () => {
  const users = JSON.parse(localStorage.getItem('users'))
  return (
    <div>
      <ol>
        {
          users ? users.map((u, index) => {
            return (
              <li key={index}>
                <Link to={{pathname: `/user/detail/${u.id}`, state: u}}>{u.name}</Link>
              </li>
            )
          }) : <span style={{color: 'lightgray'}}>暂无数据</span>
        }
      </ol>
    </div>
  )
}
export default UserList

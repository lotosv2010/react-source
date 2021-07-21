import ReactDOM from './lib/react-dom/index';
import React from './lib/react/index';
// import React from 'react';
// import ReactDOM from 'react-dom';
import './index.css';

const onClick = (e) => {
  console.log('event', e);
  e.persist();
  console.log('onClick', e.screenX);
  setTimeout(() => {
    console.log('screenX', e.screenX);
  }, 1000);
}
const element = React.createElement('button', {id: 'sayHello', onClick}, 'say', React.createElement('span', {style: {color: 'red'}}, ' hello'));
console.log(element)
ReactDOM.render(
  element,
  document.getElementById('root')
);


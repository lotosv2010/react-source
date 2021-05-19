import React from 'react';
import RouterContext from './RouterContext'

// todo:withRouter不是组件，只是一个函数
const withRouter = (OldComponent) => {
  return props => (
    <RouterContext.Consumer>
      {
        context => <OldComponent {...props} {...context} />
      }
    </RouterContext.Consumer>
  );
}

export default withRouter;

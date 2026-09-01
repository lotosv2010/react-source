import "./index.css";
import App from "./jsx/index";
import runReconcilerDemo from "./reconciler/index";

// react-dom 还没搭建（按渲染链路顺序，要等 Fiber/reconciler 先出来），
// 这里先只验证 createElement/jsx 能不能正常产出 element 对象。
console.log("App", App());

// reconciler 主链路验证：注入手写 DOM HostConfig 后，走
// createContainer/updateContainer → workLoop → commit 渲染到真实 DOM。
runReconcilerDemo();

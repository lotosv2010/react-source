import "./index.css";
import App from "./jsx/index";

// react-dom 还没搭建（按渲染链路顺序，要等 Fiber/reconciler 先出来），
// 这里先只验证 createElement/jsx 能不能正常产出 element 对象。
console.log("App", App());

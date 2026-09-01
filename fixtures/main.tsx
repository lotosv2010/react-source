import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./jsx/index";
import DomComp from "./dom/index";
// import runReconcilerDemo from "./reconciler/index";
import runSchedulerDemo from "./scheduler/index";

// react-dom 简版（createRoot）已落地，HostConfig 由构建时 fork 注入，
// 这里先只验证 createElement/jsx 能不能正常产出 element 对象。
console.log("App", App());

// reconciler 主链路验证：用 react-dom 的 createRoot 驱动
// createContainer/updateContainer → workLoop → commit 渲染到真实 DOM。
// runReconcilerDemo();

// scheduler 验证：时间切片 / 并发渲染不阻塞 / flushSync 抢占（Phase 4）
runSchedulerDemo();

const root = createRoot(document.getElementById("root")!);
root.render(
  <>
    <App />
    <DomComp stage={10} />
  </>,
);

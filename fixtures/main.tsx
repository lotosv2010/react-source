import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./jsx/index";
import DomComp from "./dom/index";
// import runReconcilerDemo from "./reconciler/index";
// import runSchedulerDemo from "./scheduler/index";
import runHooksDemo from "./hooks/index";
import runEventsDemo from "./events/index";

// react-dom 简版（createRoot）已落地，HostConfig 由构建时 fork 注入，
// 这里先只验证 createElement/jsx 能不能正常产出 element 对象。
console.log("App", App());

// reconciler 主链路验证：用 react-dom 的 createRoot 驱动
// createContainer/updateContainer → workLoop → commit 渲染到真实 DOM。
// runReconcilerDemo();

// scheduler 验证：时间切片 / 并发渲染不阻塞 / flushSync 抢占（Phase 4）
// runSchedulerDemo();

// hooks 验证：useState/useEffect/useLayoutEffect/useMemo/useCallback/useReducer/useContext/useRef/useImperativeHandle/useDebugValue
runHooksDemo();

// 事件系统验证：合成事件 + 事件委托 + 批量更新（Phase 6）
runEventsDemo();

const root = createRoot(document.getElementById("root")!);
root.render(
  <>
    <App />
    <DomComp stage={10} />
  </>,
);

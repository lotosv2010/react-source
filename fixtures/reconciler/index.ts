import "./index.css";
import { Fragment, jsx } from "react/jsx-runtime";
import {
  createContainer,
  setHostConfig,
  updateContainer,
} from "react-reconciler";
import { ConcurrentRoot } from "react-reconciler/constants";

import { domHostConfig, setRootHostContainer } from "./domHostConfig";

// react-dom 还没搭建，这里注入一份手写的 DOM HostConfig（domHostConfig.ts），
// 直接驱动 reconciler 的同步主链路（mount → update → diff → commit）渲染到真实 DOM，
// 验证 setHostConfig 运行时注入 + Fiber 主链路能跑通。等 react-dom 落地后删除。

// 演示组件：根据 props.stage 渲染不同结构，覆盖挂载 / 文本更新 / 多节点 diff（删除+移动）
function App(props: { stage: number }): any {
  const heading = jsx("h1", { children: "Reconciler Demo" });
  const paragraph = jsx("p", { children: "stage " + props.stage });

  // stage 1 列表 [a, b, c]；stage 2 变成 [c, a]：b 被删除、a 移动到 c 后面
  const list =
    props.stage === 1
      ? jsx("ul", {
          children: [
            jsx("li", { key: "a", children: "A" }),
            jsx("li", { key: "b", children: "B" }),
            jsx("li", { key: "c", children: "C" }),
          ],
        })
      : jsx("ul", {
          children: [
            jsx("li", { key: "c", children: "C" }),
            jsx("li", { key: "a", children: "A" }),
          ],
        });

  return jsx("div", {
    className: props.stage === 1 ? "demo" : "demo updated",
    children: [jsx(Fragment, { children: [heading, paragraph] }), list],
  });
}

function runReconcilerDemo(): void {
  const rootElement = document.getElementById("root");
  if (rootElement === null) {
    throw new Error("找不到 #root 容器，请检查 index.html");
  }

  setRootHostContainer(rootElement);
  setHostConfig(domHostConfig);

  // 对照 ReactDOM.createRoot：ConcurrentRoot 是 createRoot 用的根模式（这里借它构造 HostRoot）
  const container = createContainer(rootElement, ConcurrentRoot);

  let stage = 1;
  const render = (nextStage: number): void => {
    updateContainer(jsx(App, { stage: nextStage }), container);
  };

  render(stage);
  console.log("mount 完成：", rootElement.innerHTML);

  // 第二次更新：b 删除、a/c 顺序调整、className 与文本更新
  setTimeout(() => {
    stage = 2;
    render(stage);
    console.log("update 完成：", rootElement.innerHTML);
  }, 1000);
}

export default runReconcilerDemo;

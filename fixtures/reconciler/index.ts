import "./index.css";
import { Fragment, jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-reconciler/src/ReactFiberWorkLoop";

// 用 react-dom 的 createRoot 驱动 reconciler 的同步主链路（mount → update → diff → commit）
// 渲染到真实 DOM。HostConfig 由构建时 fork 注入（vite alias 把 ReactFiberConfig
// 替换成 react-dom 的 ReactDOMHostConfig），不再手写 host config 直连 reconciler。

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

  // 对照 ReactDOM.createRoot：createRoot(container) 返回 ReactDOMRoot，调用 render 渲染
  const root = createRoot(rootElement);

  let stage = 1;
  const render = (nextStage: number): void => {
    root.render(jsx(App, { stage: nextStage }));
  };

  // Phase 4 并发化后 render 是异步提交（DefaultLane 并发），用 flushSync 让同步路径
  // 立即提交，便于紧随其后的 innerHTML 断言读到已提交的 DOM。
  flushSync(() => render(stage));
  console.log("mount 完成：", rootElement.innerHTML);

  // 第二次更新：b 删除、a/c 顺序调整、className 与文本更新
  setTimeout(() => {
    stage = 2;
    flushSync(() => render(stage));
    console.log("update 完成：", rootElement.innerHTML);
  }, 1000);
}

export default runReconcilerDemo;

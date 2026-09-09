/**
 * @file ReactFiberConfig 的 DOM fork
 * @description 对照官方 packages/react-reconciler/src/forks/ReactFiberConfig.dom.js：
 * 官方 rollup（scripts/rollup/forks.js）按 entry 在 inlinedHostConfigs 里查到渲染器的
 * shortName（react-dom → 'dom'），再把 reconciler 的 ReactFiberConfig 占位模块替换成
 * `forks/ReactFiberConfig.<shortName>.js`。所以 fork 层只是一个 re-export 间接层，
 * 真正的实现留在渲染器包里（本项目为 react-dom-bindings 的 ReactDOMHostConfig）。
 *
 * 官方 v18 这里叫 ReactFiberHostConfig.dom.js 且 re-export 自 react-dom/src/client；
 * v18.3+ 把 host config 挪进 react-dom-bindings、文件改名 ReactFiberConfig，本项目
 * 已对齐后者的命名与分包，故路径指向 react-dom-bindings。
 *
 * 官方另有 ReactClientConsoleConfigBrowser 一起 re-export（react-client 包，负责 DEV 下
 * console 的 badge 前缀），本项目未实现 react-client，暂不引入。
 */

export * from "react-dom-bindings/src/client/ReactDOMHostConfig";

import { createElement, isValidElement, jsx, jsxDEV } from "./ReactElement";

// 对照官方 packages/react/src/index.js：真正的入口是 index.js 里 re-export React.js 的内容。
// jsx()/jsxDEV() 官方是从 react/jsx-runtime、react/jsx-dev-runtime 这两个独立子路径导出的
// （给 babel 自动运行时用），本仓库目前只有一个包入口，等构建链路支持多入口再拆出来。
export { createElement, isValidElement, jsx, jsxDEV };

export default {
  version: "1.0.0",
  createElement,
  isValidElement,
  jsx,
  jsxDEV,
};

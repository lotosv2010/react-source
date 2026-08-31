import { createElement, isValidElement } from "./ReactElement";

// 对照官方 packages/react/index.js re-export './src/React'：
// 经典入口只暴露 createElement/isValidElement，jsx/jsxDEV 已经拆到
// jsx-runtime.ts / jsx-dev-runtime.ts 两个独立入口（对应 react/jsx-runtime、
// react/jsx-dev-runtime），不再从这里导出。
export { createElement, isValidElement };

export default {
  version: "1.0.0",
  createElement,
  isValidElement,
};

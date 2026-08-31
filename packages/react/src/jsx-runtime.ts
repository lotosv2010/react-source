/**
 * @file React JSX Runtime 生产环境入口
 * @description Babel automatic runtime 生产模式使用的入口，导出 jsx/jsxs/Fragment
 */

// 对照官方 packages/react/jsx-runtime.js：babel automatic runtime 生产环境用的入口。
export { Fragment, jsx, jsxs } from "./jsx/ReactJSX";

/**
 * @file react-dom 客户端转出层
 * @description 对照官方 src/client/ReactDOMClient.js：官方在这一层从 ReactDOMRoot 转出
 * createRoot/hydrateRoot，再额外挂 findDOMNode、version、DevTools 注入等。简版只做转出。
 */

export { createRoot } from "./ReactDOMRoot";

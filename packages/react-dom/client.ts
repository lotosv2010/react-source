/**
 * @file react-dom/client 入口
 * @description 源码调试入口（vite/tsc 用），与主入口一致转出 createRoot。
 * 对照官方 packages/react-dom/client.js：独立子路径入口，导出 createRoot/hydrateRoot。
 */

export { createRoot } from "./src/client/ReactDOMClient";

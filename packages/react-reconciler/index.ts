/**
 * @file react-reconciler 主入口
 * @description 转出 ReactFiberReconciler（createContainer/updateContainer 等挂载/更新入口）
 */

// 对照官方 packages/react-reconciler/index.js：官方这一层就是一行
// `export * from './src/ReactFiberReconciler'`，主入口职责只在转发，具体实现都在 src 里。
export * from "./src/ReactFiberReconciler";

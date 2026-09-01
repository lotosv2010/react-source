/**
 * @file react-reconciler/constants 入口
 * @description 对外暴露的常量集合，独立于主入口打包，供渲染器在不引入完整 reconciler 的情况下取用
 */

// 对照官方 packages/react-reconciler/constants.js：`export * from './src/ReactReconcilerConstants'`，
// 这个入口只转出 ReactReconcilerConstants，目的是让渲染器（如 react-dom）能拿到
// LegacyRoot/ConcurrentRoot 而不必依赖完整的 react-reconciler 主 bundle。
export * from "./src/ReactReconcilerConstants";

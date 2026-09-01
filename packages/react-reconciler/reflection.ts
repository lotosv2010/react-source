/**
 * @file react-reconciler/reflection 入口
 * @description 对外暴露的 Fiber 树只读查询工具，独立于主入口打包，供渲染器按需引入
 */

// 对照官方 packages/react-reconciler/reflection.js：`export * from './src/ReactFiberTreeReflection'`，
// 转出 ReactFiberTreeReflection.js 里的查询工具（findCurrentHostFiber 等），
// 供渲染器在不引入完整 reconciler 主 bundle 的情况下定位真实 DOM 节点对应的 Fiber。
export * from "./src/ReactFiberTreeReflection";

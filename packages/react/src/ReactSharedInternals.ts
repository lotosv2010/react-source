/**
 * @file React 内部共享状态
 * @description 聚合 React 内部的全局状态（CurrentOwner/CurrentDispatcher 等）
 */

import ReactCurrentOwner from "./ReactCurrentOwner";

// 对照官方 packages/react/src/ReactSharedInternals.js：真实实现会聚合
// ReactCurrentDispatcher/ReactCurrentBatchConfig 等尚未落地的内部状态，等 hooks/reconciler
// 搭建时再补充。官方 shared/ReactSharedInternals.js（jsx-runtime 侧引用的版本）通过
// require('react') 跨包拿同一份单例，因为 jsx-runtime 是独立 bundle；本项目 jsx-runtime
// 入口和 react 主入口目前同属一个包，直接 import 同一个模块即可共享状态，不复刻跨包间接层。

/**
 * React 内部共享状态对象
 * 目前包含 ReactCurrentOwner，后续会添加 Dispatcher、BatchConfig 等
 */
const ReactSharedInternals = {
  ReactCurrentOwner,
};

export default ReactSharedInternals;

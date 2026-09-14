/**
 * @file React 内部共享状态
 * @description 聚合 React 内部的全局状态（CurrentOwner/CurrentDispatcher 等）
 */

import ReactCurrentOwner from "./ReactCurrentOwner";
import ReactCurrentDispatcher from "./ReactCurrentDispatcher";
import ReactCurrentBatchConfig from "./ReactCurrentBatchConfig";

// 对照官方 packages/react/src/ReactSharedInternals.js：真实实现会聚合
// ReactCurrentDispatcher/ReactCurrentBatchConfig 等内部状态。官方 shared/ReactSharedInternals.js
// （jsx-runtime 侧引用的版本）通过 require('react') 跨包拿同一份单例，因为 jsx-runtime 是
// 独立 bundle；本项目 jsx-runtime 入口和 react 主入口目前同属一个包，直接 import 同一个模块
// 即可共享状态，不复刻跨包间接层。
const ReactSharedInternals = {
  ReactCurrentOwner,
  ReactCurrentDispatcher,
  ReactCurrentBatchConfig,
};

export default ReactSharedInternals;

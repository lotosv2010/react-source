/**
 * @file React 主入口
 * @description 导出 React 经典 API（createElement、isValidElement）
 */

import { createElement, isValidElement } from "./ReactElement";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "./ReactHooks";
import ReactSharedInternals from "./ReactSharedInternals";

// 对照官方 packages/react/index.js re-export './src/React'：
// 经典入口只暴露 createElement/isValidElement，jsx/jsxDEV 已经拆到
// jsx-runtime.ts / jsx-dev-runtime.ts 两个独立入口（对应 react/jsx-runtime、
// react/jsx-dev-runtime），不再从这里导出。
export {
  createElement,
  isValidElement,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
};

// 对照官方 v18 的 __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED：reconciler 与 react
// 是两个独立发布的包，reconciler 要在渲染前切换 ReactCurrentDispatcher.current 却不能反向
// 依赖 react 包的具体实现，只能通过这个"秘密"导出拿到共享单例。命名故意起得吓人，提醒使用者
// 这不是公共 API，版本不匹配时随时可能改变形状。
export { ReactSharedInternals as __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED };

export default {
  version: "1.0.0",
  createElement,
  isValidElement,
  useState,
  useReducer,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useTransition,
  useDeferredValue,
};

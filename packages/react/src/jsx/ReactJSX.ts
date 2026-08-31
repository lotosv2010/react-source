/**
 * @file JSX automatic runtime 统一导出
 * @description 分发 jsx/jsxs/jsxDEV 实现，供 jsx-runtime.ts / jsx-dev-runtime.ts 引用
 */

import { REACT_FRAGMENT_TYPE } from "shared/ReactSymbols";

import { jsx as jsxProd, jsxDEV as jsxDEVImpl } from "./ReactJSXElement";

// 对照官方 packages/react/src/jsx/ReactJSX.js：官方 DEV 下 jsx/jsxs 会指向
// ReactJSXElementValidator.ts 里的 jsxWithValidationDynamic/jsxWithValidationStatic
// （做 key 唯一性、propTypes、Fragment props 等校验），但 Validator 依赖的
// isValidElementType/checkPropTypes/forwardRef/memo 等模块本项目尚未实现，
// 故这里 jsx/jsxs 暂时 DEV/prod 都直接指向 jsxProd，等 Validator 落地后再补上分发逻辑。

/** 生产环境 jsx 实现（当前 DEV/prod 均指向同一实现，见上方注释） */
const jsx = jsxProd;
// 官方注释：jsxs 理论上可以针对静态 children 做特殊优化，目前和 jsx 产出完全相同的实现。
/** 静态 children 场景的 jsx 实现（当前与 jsx 完全相同） */
const jsxs = jsxProd;
/** 开发环境 jsx 实现，携带 DEV 校验逻辑；prod 构建下为 undefined */
const jsxDEV = __DEV__ ? jsxDEVImpl : undefined;

export { REACT_FRAGMENT_TYPE as Fragment, jsx, jsxs, jsxDEV };

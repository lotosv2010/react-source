import { REACT_FRAGMENT_TYPE } from "shared/ReactSymbols";

import { jsx as jsxProd, jsxDEV as jsxDEVImpl } from "./ReactJSXElement";

// 对照官方 packages/react/src/jsx/ReactJSX.js：官方 DEV 下 jsx/jsxs 会指向
// ReactJSXElementValidator.ts 里的 jsxWithValidationDynamic/jsxWithValidationStatic
// （做 key 唯一性、propTypes、Fragment props 等校验），但 Validator 依赖的
// isValidElementType/checkPropTypes/forwardRef/memo 等模块本项目尚未实现，
// 故这里 jsx/jsxs 暂时 DEV/prod 都直接指向 jsxProd，等 Validator 落地后再补上分发逻辑。
const jsx = jsxProd;
// 官方注释：jsxs 理论上可以针对静态 children 做特殊优化，目前和 jsx 产出完全相同的实现。
const jsxs = jsxProd;
const jsxDEV = __DEV__ ? jsxDEVImpl : undefined;

export { REACT_FRAGMENT_TYPE as Fragment, jsx, jsxs, jsxDEV };

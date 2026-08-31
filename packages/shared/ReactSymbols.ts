/**
 * @file React 内部 Symbol 常量
 * @description 定义 React 元素类型标识符，使用 Symbol.for 保证多实例互认
 */

// 对照官方 packages/shared/ReactSymbols.js：用 Symbol.for 而非普通 Symbol，
// 保证同一份 React 出现多份实例（如被打包两次）时依然能通过该值互认。

/**
 * ReactElement 的类型标识符
 * 用于 isValidElement 判断对象是否为 React 元素
 */
export const REACT_ELEMENT_TYPE = Symbol.for("react.element");

/**
 * Fragment 的类型标识符
 * 用于识别 <React.Fragment> 或 <> 语法
 */
export const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");

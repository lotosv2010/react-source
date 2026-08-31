// 对照官方 packages/shared/ReactSymbols.js：用 Symbol.for 而非普通 Symbol，
// 保证同一份 React 出现多份实例（如被打包两次）时依然能通过该值互认。
export const REACT_ELEMENT_TYPE = Symbol.for("react.element");
export const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");

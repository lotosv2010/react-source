/**
 * @file 安全的 hasOwnProperty 引用
 * @description 避免对象可能覆盖自身的 hasOwnProperty 方法，统一使用原型链上的版本
 */

// 对照官方 packages/shared/hasOwnProperty.js

/**
 * 从 Object.prototype 获取的 hasOwnProperty 方法引用
 * 用于安全检查对象自有属性，避免用户对象覆盖该方法
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;

export default hasOwnProperty;

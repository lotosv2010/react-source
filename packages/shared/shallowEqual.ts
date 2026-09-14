/**
 * @file 浅比较
 * @description 逐个属性用 Object.is 比较两个对象是否"浅相等"，PureComponent 的默认
 * shouldComponentUpdate 用它对比新旧 props/state
 */

// 对照官方 packages/shared/shallowEqual.js

import hasOwnProperty from "./hasOwnProperty";
import is from "./objectIs";

function shallowEqual(objA: any, objB: any): boolean {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!hasOwnProperty.call(objB, key) || !is(objA[key], (objB as any)[key])) {
      return false;
    }
  }

  return true;
}

export default shallowEqual;

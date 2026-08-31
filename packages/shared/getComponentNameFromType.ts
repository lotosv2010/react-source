import { REACT_FRAGMENT_TYPE } from "./ReactSymbols";
import type { ElementType } from "./ReactTypes";

// 对照官方 packages/shared/getComponentNameFromType.js（简化版）：
// 只还原当前用得到的分支（函数组件、字符串标签、Fragment），
// Context/Provider/ForwardRef/Memo/Lazy 等到对应功能落地时再补。
export default function getComponentNameFromType(
  type: ElementType,
): string | null {
  if (type == null) {
    return null;
  }
  if (typeof type === "function") {
    return type.displayName || type.name || null;
  }
  if (typeof type === "string") {
    return type;
  }
  if (type === REACT_FRAGMENT_TYPE) {
    return "Fragment";
  }
  return null;
}

/**
 * @file memo
 * @description 对照官方 packages/react/src/ReactMemo.js：把 type 包装成
 * { $$typeof: REACT_MEMO_TYPE, type, compare } 对象，reconciler 靠 $$typeof 识别出
 * MemoComponent 这个 WorkTag，更新时用 compare（默认 shallowEqual）比较新旧 props，
 * props 相等且 ref 相同则跳过重渲染。
 */

import { REACT_MEMO_TYPE } from "shared/ReactSymbols";

// 返回类型带调用签名 `(props): any`，纯粹是给 TS 的 JSX 元素类型检查用的（同 ReactForwardRef.ts
// 的取舍），运行时不会真的把这个对象当函数调用。
export function memo<Props>(
  type: (props: Props) => any,
  compare?: (oldProps: Props, newProps: Props) => boolean,
): { $$typeof: symbol; type: any; compare: typeof compare | null } & ((
  props: Props,
) => any) {
  return {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare === undefined ? null : compare,
  } as any;
}

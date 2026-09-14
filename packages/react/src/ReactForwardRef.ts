/**
 * @file forwardRef
 * @description 对照官方 packages/react/src/ReactForwardRef.js：把 render 函数包装成
 * { $$typeof: REACT_FORWARD_REF_TYPE, render } 对象，reconciler 靠 $$typeof 识别出
 * ForwardRef 这个 WorkTag，渲染时把 fiber.ref 作为第二个参数传给 render。
 */

import { REACT_FORWARD_REF_TYPE } from "shared/ReactSymbols";

// 返回类型带调用签名 `(props): any`，纯粹是给 TS 的 JSX 元素类型检查用的（对照
// ReactTypes.ts 的 ReactProviderType 同样的取舍），运行时不会真的把这个对象当函数调用。
export function forwardRef<Ref, Props = Record<string, never>>(
  render: (props: Props, ref: Ref) => any,
): { $$typeof: symbol; render: (props: Props, ref: Ref) => any } & ((
  props: Props & {
    ref?: { current: Ref | null } | ((instance: Ref) => void) | null;
  },
) => any) {
  return {
    $$typeof: REACT_FORWARD_REF_TYPE,
    render,
  } as any;
}

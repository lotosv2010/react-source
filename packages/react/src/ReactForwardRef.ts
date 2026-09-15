/**
 * @file forwardRef
 * @description 对照官方 packages/react/src/ReactForwardRef.js：把 render 函数包装成
 * { $$typeof: REACT_FORWARD_REF_TYPE, render } 对象，reconciler 靠 $$typeof 识别出
 * ForwardRef 这个 WorkTag，渲染时把 fiber.ref 作为第二个参数传给 render。
 */

import { REACT_FORWARD_REF_TYPE } from "shared/ReactSymbols";

// 返回类型带调用签名 `(props): any`，纯粹是给 TS 的 JSX 元素类型检查用的（对照
// ReactTypes.ts 的 ReactProviderType 同样的取舍），运行时不会真的把这个对象当函数调用。
// render 的第二个参数是父组件挂在这个元素上的 ref 本身（对象或函数形式），不是解析出的
// 实例——之前误把两者混成同一个 Ref 类型参数，useImperativeHandle 接的正是这个 ref 容器，
// 类型对不上会报错，这里改成与 fiber.ref 实际形状一致的容器类型。
type RefContainer<Ref> =
  { current: Ref | null } | ((instance: Ref | null) => void) | null;

// 默认 Props 用 object（无索引签名，结构化子类型下允许任意具体属性），不用
// Record<string, never>——后者的索引签名会强制所有字符串键都是 never，
// 与下面交叉进来的 `ref` 属性直接冲突，导致默认无 Props 的 forwardRef 组件反而无法传 ref。
export function forwardRef<Ref, Props = object>(
  render: (props: Props, ref: RefContainer<Ref>) => any,
): {
  $$typeof: symbol;
  render: (props: Props, ref: RefContainer<Ref>) => any;
} & ((
  props: Props & {
    ref?: RefContainer<Ref>;
  },
) => any) {
  return {
    $$typeof: REACT_FORWARD_REF_TYPE,
    render,
  } as any;
}

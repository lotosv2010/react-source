// 对照官方 packages/shared/ReactTypes.js：官方用 Flow 类型，这里用 TS 改写，
// 先给出 ReactElement 相关最小类型，其余（Context/Portal 等）等对应功能落地时再补。
export type Key = string | null;

// ref 官方支持 string（legacy）、RefObject、回调函数三种形态
export type Ref =
  string | { current: unknown } | ((instance: unknown) => void) | null;

export type Props = Record<string, any>;

// 组件类型：原生标签名（string）或函数/class 组件，reconciler 落地前先用 any 兜底
export type ElementType = any;

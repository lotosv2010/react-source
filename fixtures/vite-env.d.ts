/// <reference types="vite/client" />

// fixtures 只是本地调试用例，不引入 @types/react（那是官方类型定义，
// 跟"手写还原实现"的定位冲突），这里给一个最小的 JSX 命名空间声明，
// 只为让 tsc 能通过 intrinsic element（<div> 等）检查。
declare namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: unknown;
  }
}

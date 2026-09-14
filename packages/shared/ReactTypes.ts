/**
 * @file React 核心类型定义
 * @description 定义 ReactElement 相关的基础类型（Key/Ref/Props/ElementType）
 */

// 对照官方 packages/shared/ReactTypes.js：官方用 Flow 类型，这里用 TS 改写，
// 先给出 ReactElement 相关最小类型，其余（Context/Portal 等）等对应功能落地时再补。

/**
 * React 元素的 key 类型
 * 用于列表渲染时的元素唯一标识
 */
export type Key = string | null;

/**
 * React 元素的 ref 类型
 * 支持三种形态：字符串 ref（legacy）、RefObject、回调函数
 */
export type Ref =
  string | { current: unknown } | ((instance: unknown) => void) | null;

/**
 * React 元素的 props 类型
 * 任意键值对对象
 */
export type Props = Record<string, any>;

/**
 * React 组件类型
 * 可以是原生标签名（string）或函数/class 组件
 * reconciler 落地前先用 any 兜底
 */
export type ElementType = any;

/**
 * createContext(defaultValue) 返回的 Context 对象
 * 对照官方 ReactTypes.js 的 ReactContext：本项目只支持单一渲染器（react-dom），
 * 省略官方为兼容双渲染器（Primary/Secondary，如 RN + Fabric）准备的 _currentValue2/
 * _currentRenderer2 字段，Consumer 也不做 DEV 专属的警告代理对象，直接复用 Provider
 * 所属的同一个 context 引用。
 *
 * 调用签名 `(props): any` 纯粹是给 TS 的 JSX 检查用的——<Context.Consumer> 运行时靠
 * $$typeof 分发到 ContextConsumer tag，并不会真的把 context 对象当函数调用。
 */
export interface ReactContext<T> {
  $$typeof: symbol;
  _currentValue: T;
  Provider: ReactProviderType<T>;
  Consumer: ReactContext<T>;
  displayName?: string;
  (props: { children: (value: T) => any }): any;
}

/**
 * Context.Provider 元素的类型标识对象
 * _context 指回所属的 Context，供 beginWork 取 context._currentValue 读写
 * 调用签名同样只为满足 TS 的 JSX 元素类型检查，见上方 ReactContext 的说明。
 */
export interface ReactProviderType<T> {
  $$typeof: symbol;
  _context: ReactContext<T>;
  (props: { value: T; children?: any }): any;
}

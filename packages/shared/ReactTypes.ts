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

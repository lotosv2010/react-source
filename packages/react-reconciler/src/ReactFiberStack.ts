/**
 * @file 通用栈基础设施
 * @description 对照官方 packages/react-reconciler/src/ReactFiberStack.new.js：render 阶段
 * 需要按 Fiber 树的进入/退出时机栈式保存并恢复某个值（Context Provider 的 value、host
 * context、legacy context 等），这套栈与具体用途无关，只是通用的 push/pop 原语。
 * pop 的时机由调用方决定（通常在 completeWork 归的时候），不是这个模块关心的事。
 */

import type { FiberNode } from "./ReactFiber";

export interface StackCursor<T> {
  current: T;
}

// 用两个平行数组模拟调用栈：valueStack 存值，index 是栈顶指针。
// 官方还有一个 DEV-only 的 fiberStack 用来校验 push/pop 是否配对，本项目先省略该校验。
const valueStack: any[] = [];

let index = -1;

/**
 * 创建一个游标，初始值为 defaultValue
 */
export function createCursor<T>(defaultValue: T): StackCursor<T> {
  return {
    current: defaultValue,
  };
}

/**
 * 弹出栈顶值，恢复 cursor.current 为入栈前的值
 * @param cursor - 目标游标
 * @param _fiber - 触发 pop 的 fiber（官方 DEV 模式下用来校验 push/pop 是否配对）
 */
export function pop<T>(cursor: StackCursor<T>, _fiber: FiberNode): void {
  if (index < 0) {
    return;
  }

  cursor.current = valueStack[index];
  valueStack[index] = null;
  index--;
}

/**
 * 把 cursor 当前值压栈，并将其设为新值
 * @param cursor - 目标游标
 * @param value - 本次要设置的新值
 * @param _fiber - 触发 push 的 fiber（官方 DEV 模式下记录进 fiberStack 供 pop 时校验）
 */
export function push<T>(
  cursor: StackCursor<T>,
  value: T,
  _fiber: FiberNode,
): void {
  index++;
  valueStack[index] = cursor.current;
  cursor.current = value;
}

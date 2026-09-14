/**
 * @file createContext
 * @description 对照官方 packages/react/src/ReactContext.js：createContext(defaultValue) 返回
 * 一个 { Provider, Consumer, _currentValue } 对象。本项目只支持单一渲染器（react-dom），
 * 省略官方为兼容双渲染器（如 RN 主/Fabric 副渲染器）准备的 _currentValue2/_currentRenderer2
 * 字段；Consumer 也不做 DEV 模式下的警告代理对象，直接复用 context 本身（对齐官方 PROD 行为）。
 */

import { REACT_CONTEXT_TYPE, REACT_PROVIDER_TYPE } from "shared/ReactSymbols";
import type { ReactContext, ReactProviderType } from "shared/ReactTypes";

/**
 * createContext() - 创建一个 Context 对象
 * @param defaultValue - 没有匹配到 Provider 时，消费端读到的默认值
 */
export function createContext<T>(defaultValue: T): ReactContext<T> {
  // ReactContext/ReactProviderType 的调用签名只为满足 TS 的 JSX 元素类型检查（见
  // shared/ReactTypes 的注释），运行时对象实际上没有那个签名，这里用 as 断言绕开检查。
  const context = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    Provider: null as any,
    Consumer: null as any,
  } as ReactContext<T>;

  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context,
  } as ReactProviderType<T>;

  context.Consumer = context;

  return context;
}

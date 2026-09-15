/**
 * @file React.lazy（代码分割）
 * @description 对照官方 packages/react/src/ReactLazy.js：lazy(ctor) 返回一个包装对象，
 * reconciler 渲染到它时调用 _init(_payload)——首次调用触发 ctor()（通常是动态 import()）
 * 拿到 thenable，resolve 前 _status 恒为 Pending，_init 直接 throw 这个 thenable，
 * 被 Suspense 的 throwException 捕获走挂起流程；resolve 后 _status 变 Resolved，
 * 下次重渲染 _init 直接返回 moduleObject.default（解析出真正的组件）。
 */

import { REACT_LAZY_TYPE } from "shared/ReactSymbols";
import type { Wakeable } from "shared/ReactTypes";

const Uninitialized = -1;
const Pending = 0;
const Resolved = 1;
const Rejected = 2;

interface Payload<T> {
  _status: -1 | 0 | 1 | 2;
  _result: (() => Promise<{ default: T }>) | Wakeable | { default: T } | any;
}

export interface LazyComponent<T> {
  $$typeof: symbol;
  _payload: Payload<T>;
  _init: (payload: Payload<T>) => T;
}

// 对照官方 lazyInitializer：payload._status 是一个简易状态机，_result 随状态变化含义不同
// （Uninitialized 时是 ctor，Pending 时是 thenable，Resolved 时是 moduleObject，Rejected
// 时是 error）。thenable 没 resolve 前直接 throw 它自己，交给 Suspense 的 isThenable 分支处理。
function lazyInitializer<T>(payload: Payload<T>): T {
  if (payload._status === Uninitialized) {
    const ctor = payload._result as () => Promise<{ default: T }>;
    const thenable = ctor();
    thenable.then(
      (moduleObject: { default: T }) => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          payload._status = Resolved;
          payload._result = moduleObject;
        }
      },
      (error: any) => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          payload._status = Rejected;
          payload._result = error;
        }
      },
    );
    if (payload._status === Uninitialized) {
      payload._status = Pending;
      payload._result = thenable;
    }
  }
  if (payload._status === Resolved) {
    const moduleObject = payload._result as { default: T };
    return moduleObject.default;
  }
  throw payload._result;
}

/**
 * React.lazy(ctor) - 懒加载组件，配合 Suspense 实现代码分割
 * @param ctor - 返回 Promise<{ default: Component }> 的函数（通常是 () => import('./Foo')）
 */
export function lazy<T>(ctor: () => Promise<{ default: T }>): LazyComponent<T> {
  const payload: Payload<T> = {
    _status: Uninitialized,
    _result: ctor,
  };

  return {
    $$typeof: REACT_LAZY_TYPE,
    _payload: payload,
    _init: lazyInitializer,
  };
}

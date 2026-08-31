import { checkKeyStringCoercion } from "shared/CheckStringCoercion";
import getComponentNameFromType from "shared/getComponentNameFromType";
import hasOwnProperty from "shared/hasOwnProperty";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import type { ElementType, Key, Props, Ref } from "shared/ReactTypes";

import ReactSharedInternals from "../ReactSharedInternals";
import type { ReactElementType } from "../ReactElement";

// 对照官方 packages/react/src/jsx/ReactJSXElement.js：这是给 babel automatic runtime
// （jsx-runtime/jsx-dev-runtime 两个独立入口）用的 jsx()/jsxDEV() 实现，和经典入口
// ../ReactElement.ts 里的 jsx()/jsxDEV() 是官方源码里故意保留的两份几乎相同的拷贝
// （历史上 automatic runtime 是后加的，为了不牵动经典入口而单独复制了一份）。
// 唯一实质差异：这里通过 ReactSharedInternals.ReactCurrentOwner 取 owner，
// 官方这么做是因为 jsx-runtime 和 react 主包是分开打包的两个 bundle，
// 要靠 require('react') 间接拿到同一份单例；本项目未拆分成独立 bundle，
// 直接 import 也能拿到同一份单例，这里仍按官方写法走 ReactSharedInternals 只是为了对照。
const ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

let specialPropKeyWarningShown = false;
let specialPropRefWarningShown = false;
let didWarnAboutStringRefs: Record<string, boolean> = {};
if (__DEV__) {
  didWarnAboutStringRefs = {};
}

function hasValidRef(config: any): boolean {
  if (__DEV__) {
    if (hasOwnProperty.call(config, "ref")) {
      const getter = Object.getOwnPropertyDescriptor(config, "ref")?.get;
      if (getter && (getter as any).isReactWarning) {
        return false;
      }
    }
  }
  return config.ref !== undefined;
}

function hasValidKey(config: any): boolean {
  if (__DEV__) {
    if (hasOwnProperty.call(config, "key")) {
      const getter = Object.getOwnPropertyDescriptor(config, "key")?.get;
      if (getter && (getter as any).isReactWarning) {
        return false;
      }
    }
  }
  return config.key !== undefined;
}

// 对照官方：这里的签名是 (config, self)，和经典 ReactElement.ts 里的
// warnIfStringRefCannotBeAutoConverted(config) 不同——self 单独传入而不是从 config.__self 取，
// 因为 automatic runtime 的 self 是 jsxDEV 的独立参数，不像经典 createElement 那样塞进 config。
function warnIfStringRefCannotBeAutoConverted(config: any, self: any): void {
  if (__DEV__) {
    if (
      typeof config.ref === "string" &&
      ReactCurrentOwner.current &&
      self &&
      (ReactCurrentOwner.current as any).stateNode !== self
    ) {
      const componentName = getComponentNameFromType(
        (ReactCurrentOwner.current as any).type,
      );

      if (!didWarnAboutStringRefs[componentName as string]) {
        console.error(
          'Component "%s" contains the string ref "%s". ' +
            "Support for string refs will be removed in a future major release. " +
            "This case cannot be automatically converted to an arrow function. " +
            "We ask you to manually fix this case by using useRef() or createRef() instead.",
          componentName,
          config.ref,
        );
        didWarnAboutStringRefs[componentName as string] = true;
      }
    }
  }
}

function defineKeyPropWarningGetter(props: Props, displayName: string): void {
  if (__DEV__) {
    const warnAboutAccessingKey = function () {
      if (!specialPropKeyWarningShown) {
        specialPropKeyWarningShown = true;
        console.error(
          "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. " +
            "If you need to access the same value within the child component, you should pass it as a different prop.",
          displayName,
        );
      }
    };
    (warnAboutAccessingKey as any).isReactWarning = true;
    Object.defineProperty(props, "key", {
      get: warnAboutAccessingKey,
      configurable: true,
    });
  }
}

function defineRefPropWarningGetter(props: Props, displayName: string): void {
  if (__DEV__) {
    const warnAboutAccessingRef = function () {
      if (!specialPropRefWarningShown) {
        specialPropRefWarningShown = true;
        console.error(
          "%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. " +
            "If you need to access the same value within the child component, you should pass it as a different prop.",
          displayName,
        );
      }
    };
    (warnAboutAccessingRef as any).isReactWarning = true;
    Object.defineProperty(props, "ref", {
      get: warnAboutAccessingRef,
      configurable: true,
    });
  }
}

// 对照官方：jsx/ReactJSXElement.js 里的 ReactElement 工厂函数和 ../ReactElement.ts 里的
// 是同一份逻辑的拷贝（官方注释里也说这是历史遗留的重复），保持两份独立是为了对照源码结构。
const ReactElement = function (
  type: ElementType,
  key: Key,
  ref: Ref,
  self: any,
  source: any,
  owner: any,
  props: Props,
): ReactElementType {
  const element: ReactElementType = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    _owner: owner,
  };

  if (__DEV__) {
    element._store = {} as { validated: boolean };
    Object.defineProperty(element._store, "validated", {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false,
    });
    Object.defineProperty(element, "_self", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: self,
    });
    Object.defineProperty(element, "_source", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: source,
    });
    if (Object.freeze) {
      Object.freeze(element.props);
      Object.freeze(element);
    }
  }

  return element;
};

// 对照官方 jsx()：automatic runtime 的生产版本，无 DEV 校验（校验在 jsxDEV 里）。
export function jsx(
  type: ElementType,
  config: any,
  maybeKey?: Key,
): ReactElementType {
  debugger;
  let propName: string;

  const props: Props = {};

  let key: Key = null;
  let ref: Ref = null;

  if (maybeKey !== undefined) {
    if (__DEV__) {
      checkKeyStringCoercion(maybeKey);
    }
    key = "" + maybeKey;
  }

  if (hasValidKey(config)) {
    if (__DEV__) {
      checkKeyStringCoercion(config.key);
    }
    key = "" + config.key;
  }

  if (hasValidRef(config)) {
    ref = config.ref;
  }

  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  if (type && (type as any).defaultProps) {
    const defaultProps = (type as any).defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }

  return ReactElement(
    type,
    key,
    ref,
    undefined,
    undefined,
    ReactCurrentOwner.current,
    props,
  );
}

// 对照官方 jsxDEV()：DEV 模式下 automatic runtime 的入口，携带 source/self 做字符串 ref 警告，
// 并给 props.key/ref 挂访问警告 getter。prod 构建里 __DEV__ 被替换为 false 后整段被 terser 删除。
export function jsxDEV(
  type: ElementType,
  config: any,
  maybeKey: Key | undefined,
  source: any,
  self: any,
): ReactElementType | undefined {
  debugger;
  if (__DEV__) {
    let propName: string;

    const props: Props = {};

    let key: Key = null;
    let ref: Ref = null;

    if (maybeKey !== undefined) {
      checkKeyStringCoercion(maybeKey);
      key = "" + maybeKey;
    }

    if (hasValidKey(config)) {
      checkKeyStringCoercion(config.key);
      key = "" + config.key;
    }

    if (hasValidRef(config)) {
      ref = config.ref;
      warnIfStringRefCannotBeAutoConverted(config, self);
    }

    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        props[propName] = config[propName];
      }
    }

    if (type && (type as any).defaultProps) {
      const defaultProps = (type as any).defaultProps;
      for (propName in defaultProps) {
        if (props[propName] === undefined) {
          props[propName] = defaultProps[propName];
        }
      }
    }

    if (key || ref) {
      const displayName =
        typeof type === "function"
          ? type.displayName || type.name || "Unknown"
          : type;
      if (key) {
        defineKeyPropWarningGetter(props, displayName);
      }
      if (ref) {
        defineRefPropWarningGetter(props, displayName);
      }
    }

    return ReactElement(
      type,
      key,
      ref,
      self,
      source,
      ReactCurrentOwner.current,
      props,
    );
  }
}

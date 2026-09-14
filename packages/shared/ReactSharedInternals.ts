/**
 * @file 跨包共享的 React 内部状态（reconciler 侧引用）
 * @description 对照官方 packages/shared/ReactSharedInternals.js：reconciler 不能反向依赖
 * react 包的具体实现，只能通过 react 包导出的"秘密"单例（__SECRET_INTERNALS_DO_NOT_USE_OR_
 * YOU_WILL_BE_FIRED）拿到 ReactCurrentDispatcher 等跨包共享状态，此处转出这份单例，
 * reconciler 内部统一 import "shared/ReactSharedInternals"。
 */

import * as React from "react";

const ReactSharedInternals = (React as any)
  .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

export default ReactSharedInternals;

/**
 * @file React 当前 Owner 状态
 * @description 记录当前正在构建的组件（Fiber），用于 DEV 警告和调试
 */

// 对照官方 packages/react/src/ReactCurrentOwner.js：记录"当前正在被构建的组件"，
// 即哪个 Fiber 在调用 createElement。reconciler 还没落地，先用 any 兜底 Fiber 类型。

/**
 * 全局单例：记录当前正在被构建的组件
 * reconciler 会在渲染过程中设置此值
 */
const ReactCurrentOwner: { current: any | null } = {
  current: null,
};

export default ReactCurrentOwner;

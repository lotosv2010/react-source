// 对照官方 packages/react/src/ReactCurrentOwner.js：记录"当前正在被构建的组件"，
// 即哪个 Fiber 在调用 createElement。reconciler 还没落地，先用 any 兜底 Fiber 类型。
const ReactCurrentOwner: { current: any | null } = {
  current: null,
};

export default ReactCurrentOwner;

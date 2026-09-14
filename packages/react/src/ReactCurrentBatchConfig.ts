/**
 * @file React 当前批处理配置
 * @description 记录当前是否处于 startTransition 回调内（transition 非 null 时），
 * requestUpdateLane 据此把更新分配到 TransitionLane 而非 DefaultLane
 */

// 对照官方 packages/react/src/ReactCurrentBatchConfig.js：transition 字段在 startTransition
// 执行期间被置为一个 Transition 对象（本项目简化为 {} 占位，不携带官方的 _updatedFibers 等
// DEV 调试字段），回调结束后恢复为 null。reconciler 的 requestUpdateLane 读取这个字段判断
// 当前触发的更新是否应该走 TransitionLane。
export type BatchConfigTransition = Record<string, never> | null;

const ReactCurrentBatchConfig: { transition: BatchConfigTransition } = {
  transition: null,
};

export default ReactCurrentBatchConfig;

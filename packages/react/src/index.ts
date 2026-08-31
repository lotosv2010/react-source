import objectIs from "shared/objectIs";

// 验证 rollup 打包链路：react 包能否正确解析 shared/* 路径别名，
// 并把 packages/shared 下的模块一并打进产物。
export function isSameValue(x: unknown, y: unknown): boolean {
  return objectIs(x, y);
}

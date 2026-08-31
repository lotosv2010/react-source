/**
 * @file Object.is polyfill
 * @description 提供 Object.is 的兼容实现，处理 +0/-0 和 NaN 的特殊比较
 */

// 对照官方 packages/shared/objectIs.js：Object.is 在旧环境可能不存在，
// React 自己实现一份 polyfill，避免依赖运行时是否支持该 API。

/**
 * Object.is 的 polyfill 实现
 * @param x - 第一个比较值
 * @param y - 第二个比较值
 * @returns 两个值是否严格相等（处理 +0/-0 和 NaN 特殊情况）
 */
const objectIs: (x: unknown, y: unknown) => boolean =
  typeof Object.is === "function"
    ? Object.is
    : function is(x: unknown, y: unknown): boolean {
        return (
          (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
          (x !== x && y !== y)
        );
      };

export default objectIs;

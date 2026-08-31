// 对照官方 packages/shared/objectIs.js：Object.is 在旧环境可能不存在，
// React 自己实现一份 polyfill，避免依赖运行时是否支持该 API。
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

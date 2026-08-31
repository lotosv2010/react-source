/**
 * @file 字符串强制转换检查
 * @description DEV 模式下检查值能否安全转换为字符串（如 key），提供更清晰的错误信息
 */

// 对照官方 packages/shared/CheckStringCoercion.js（简化版）：
// `'' + value` 这种写法在 value 是 Symbol 或某些 valueOf 会抛异常的对象时会直接崩溃，
// 且报错信息很难定位到底是哪个 key/prop 出的问题。DEV 下先探测一遍，抛出更明确的错误。

/**
 * 测试值能否转换为字符串
 * @param value - 待测试的值
 * @returns 转换后的字符串
 * @throws 当值无法转换为字符串时抛出异常
 */
function testStringCoercion(value: unknown): string {
  return "" + (value as any);
}

/**
 * 检查 key 值能否安全转换为字符串
 * @param value - key 值
 * @description DEV 模式下会先探测转换是否会失败，并输出明确的错误信息
 */
export function checkKeyStringCoercion(value: unknown): void {
  if (__DEV__) {
    try {
      testStringCoercion(value);
    } catch {
      const type =
        typeof value === "object" && value !== null
          ? (value as { constructor?: { name?: string } }).constructor?.name ||
            "Object"
          : typeof value;
      console.error(
        "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
        type,
      );
      testStringCoercion(value);
    }
  }
}

// 对照官方：__DEV__ 是构建时注入的全局常量（dev 包为 true，prod 包为 false），
// 由 rollup 的 @rollup/plugin-replace 在打包时字符串替换，配合 terser 在 prod 包里删除死代码。
// 这里只是给 TS 一个环境声明，运行时的值来自构建配置，不是真实存在的全局变量。
declare const __DEV__: boolean;

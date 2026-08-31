import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.resolve(import.meta.dirname, "../..");

// 对照 rollup 侧 __DEV__ 的用法：fixtures 场景固定跑 dev 分支，
// 不像 rollup build.js 那样区分 isProduction。
export default defineConfig({
  root: path.resolve(rootDir, "fixtures"),
  plugins: [react()],
  define: {
    __DEV__: JSON.stringify(true),
  },
  // 说明：vite v8 默认的依赖预构建会把源码文件缓存到 node_modules/.vite/deps/，改 packages/ 源码不生效。
  // debug fixtures 不需要依赖预构建，禁用它，让 alias 映射的源码始终被 vite 依赖图跟踪。
  optimizeDeps: {
    disabled: true,
  },
  resolve: {
    alias: [
      // 更具体的子路径要排在 react 前面，避免被短 key 提前匹配掉
      {
        find: "react/jsx-dev-runtime",
        replacement: path.resolve(
          rootDir,
          "packages/react/src/jsx-dev-runtime.ts",
        ),
      },
      {
        find: "react/jsx-runtime",
        replacement: path.resolve(rootDir, "packages/react/src/jsx-runtime.ts"),
      },
      {
        // 必须使用精确匹配，否则会把 react/jsx-dev-runtime 拼成 ".../index.ts/jsx-dev-runtime"
        find: /^react$/,
        replacement: path.resolve(rootDir, "packages/react/src/index.ts"),
      },
      // packages/shared 的源码没有入口文件，react 等包内部按官方习惯直接写
      // import xxx from 'shared/yyy'，故用正则把 shared/xx 映射到其 ts 源码，
      // 保证 vite 的依赖图覆盖到 shared 文件（改动无需重启 dev 即可热更新）
      {
        find: /^shared\/(.*)$/,
        replacement: path.resolve(rootDir, "packages/shared/$1.ts"),
      },
    ],
  },
});

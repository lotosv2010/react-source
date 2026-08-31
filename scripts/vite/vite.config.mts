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
        find: "react",
        replacement: path.resolve(rootDir, "packages/react/src/index.ts"),
      },
    ],
  },
});

"use strict";

const bundleTypes = {
  NODE_DEV: "NODE_DEV",
  NODE_PROD: "NODE_PROD",
  ESM_DEV: "ESM_DEV",
  ESM_PROD: "ESM_PROD",
  // 对照官方 BROWSER_SCRIPT：给 <script> 标签直接引入用的全局变量包（iife 格式）
  BROWSER_SCRIPT: "BROWSER_SCRIPT",
};

const moduleTypes = {
  ISOMORPHIC: "ISOMORPHIC",
  RENDERER: "RENDERER",
  RECONCILER: "RECONCILER",
  SCHEDULER: "SCHEDULER",
};

// 对照官方 scripts/rollup/bundles.js：每新增一个可独立发布的包（react、react-dom、scheduler ...），
// 在这里补一条 bundle 描述，build.js 会据此批量打包。
// 当前 packages/shared 只被其他包内部引用，不单独产出 bundle，故不在此列出。
const bundles = [
  {
    moduleType: moduleTypes.ISOMORPHIC,
    packageName: "react",
    name: "react",
    entry: "packages/react/src/index.ts",
    // BROWSER_SCRIPT（iife）挂载到全局变量时用的名字，对应官方 window.React
    global: "React",
    externals: [],
    bundleTypes: [
      bundleTypes.NODE_DEV,
      bundleTypes.NODE_PROD,
      bundleTypes.ESM_DEV,
      bundleTypes.ESM_PROD,
      bundleTypes.BROWSER_SCRIPT,
    ],
  },
];

module.exports = {
  bundleTypes,
  moduleTypes,
  bundles,
};

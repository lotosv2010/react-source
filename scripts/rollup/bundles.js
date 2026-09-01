"use strict";

// 对照官方 scripts/rollup/bundles.js 的 bundleTypes：react 18.3.1 实际发布包里没有 esm/，
// 但有 umd/（iife 格式，UMD_DEV/UMD_PROD 两个产物），故这里对齐官方命名，不再用 ESM_*/BROWSER_SCRIPT
const bundleTypes = {
  NODE_DEV: "NODE_DEV",
  NODE_PROD: "NODE_PROD",
  UMD_DEV: "UMD_DEV",
  UMD_PROD: "UMD_PROD",
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
    // UMD（iife）挂载到全局变量时用的名字，对应官方 window.React
    global: "React",
    externals: [],
    bundleTypes: [
      bundleTypes.NODE_DEV,
      bundleTypes.NODE_PROD,
      bundleTypes.UMD_DEV,
      bundleTypes.UMD_PROD,
    ],
  },
  // 对照官方 scripts/rollup/bundles.js 里 entry: 'react/jsx-runtime'：
  // jsx-runtime/jsx-dev-runtime 官方只产出 NODE_DEV/NODE_PROD（cjs），没有 UMD 产物。
  {
    moduleType: moduleTypes.ISOMORPHIC,
    packageName: "react",
    name: "react-jsx-runtime",
    entry: "packages/react/src/jsx-runtime.ts",
    externals: [],
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD],
  },
   /******* React JSX DEV Runtime *******/
  {
    moduleType: moduleTypes.ISOMORPHIC,
    packageName: "react",
    name: "react-jsx-dev-runtime",
    entry: "packages/react/src/jsx-dev-runtime.ts",
    externals: [],
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD],
  },
   /******* React Reconciler *******/
  {
    moduleType: moduleTypes.RECONCILER,
    packageName: "react-reconciler",
    name: "react-reconciler",
    entry: "packages/react-reconciler/index.ts",
    externals: ["react"],
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD],
  },
   /******* Reconciler Reflection *******/
  {
    moduleType: moduleTypes.RECONCILER,
    packageName: "react-reconciler",
    name: "react-reconciler-reflection",
    entry: "packages/react-reconciler/reflection.ts",
    externals: ["react"],
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD],
  },
  /******* Reconciler Constants *******/
  {
    moduleType: moduleTypes.RECONCILER,
    packageName: "react-reconciler",
    name: "react-reconciler-constants",
    entry: "packages/react-reconciler/constants.ts",
    externals: ["react"],
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD],
  },
  /******* React DOM *******/
  {
    moduleType: moduleTypes.RENDERER,
    packageName: "react-dom",
    name: "react-dom",
    entry: "packages/react-dom/index.ts",
    // 对照官方：react-dom 只把 react 作为 external，reconciler/shared 都 inline 进产物
    externals: ["react"],
    // 简版先只产 cjs（NODE_DEV/NODE_PROD），UMD 产物后续补
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD],
  },
];

module.exports = {
  bundleTypes,
  moduleTypes,
  bundles,
};

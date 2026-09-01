"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../..");

// 对照官方 scripts/rollup/packaging.js 的 prepareNpmPackage：
// 构建产物 + LICENSE/README + 发布用 package.json 一起收集到 build/node_modules/<pkg>/，
// 这个目录才是真正 npm publish 的包根，跟 packages/<pkg>/（源码 + workspace 用 package.json）分开。

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirSync(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// 对照官方发布包的 package.json 字段，但去掉 npm/ 前缀（这里描述的就是发布目录本身），
// 也不带 workspace 依赖（shared 的代码已经被 rollup 打进各个 bundle，发布包不需要额外依赖它）。
// react 包带 jsx-runtime/jsx-dev-runtime 两个独立入口；react-reconciler 带 constants/reflection 两个独立入口，
// 两者 files/exports 不同，故按包名区分。
function buildPublishPackageJson(sourcePackageJson) {
  if (sourcePackageJson.name === "react-reconciler") {
    return {
      name: sourcePackageJson.name,
      description: sourcePackageJson.description,
      keywords: sourcePackageJson.keywords,
      version: sourcePackageJson.version,
      license: sourcePackageJson.license || "MIT",
      files: [
        "LICENSE",
        "README.md",
        "index.js",
        "constants.js",
        "reflection.js",
        "cjs/",
      ],
      main: "index.js",
      exports: {
        ".": "./index.js",
        "./constants": "./constants.js",
        "./reflection": "./reflection.js",
        "./package.json": "./package.json",
      },
    };
  }
  return {
    name: sourcePackageJson.name,
    description: "React is a JavaScript library for building user interfaces.",
    keywords: ["react"],
    version: sourcePackageJson.version,
    license: sourcePackageJson.license || "MIT",
    files: [
      "LICENSE",
      "README.md",
      "index.js",
      "cjs/",
      "umd/",
      "jsx-runtime.js",
      "jsx-dev-runtime.js",
    ],
    main: "index.js",
    exports: {
      ".": "./index.js",
      "./package.json": "./package.json",
      "./jsx-runtime": "./jsx-runtime.js",
      "./jsx-dev-runtime": "./jsx-dev-runtime.js",
    },
  };
}

function prepareNpmPackage(packageName) {
  const packageDir = path.join(rootDir, "packages", packageName);
  const buildDir = path.join(rootDir, "build", "node_modules", packageName);

  fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });

  // 对照官方：LICENSE/README 各包自己没有维护，统一从仓库根目录复制
  copyFileSync(path.join(rootDir, "LICENSE"), path.join(buildDir, "LICENSE"));
  copyFileSync(path.join(rootDir, "README.md"), path.join(buildDir, "README.md"));

  const sourcePackageJson = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf-8"),
  );
  const publishPackageJson = buildPublishPackageJson(sourcePackageJson);
  fs.writeFileSync(
    path.join(buildDir, "package.json"),
    JSON.stringify(publishPackageJson, null, 2) + "\n",
  );

  // npm/ 目录下手写的分发文件（index.js 等）+ rollup 构建产物（cjs/、umd/），原样铺到发布包根目录
  copyDirSync(path.join(packageDir, "npm"), buildDir);

  console.log(`prepared npm package: ${packageName} -> ${path.relative(rootDir, buildDir)}`);
}

function prepareNpmPackages(packageNames) {
  for (const packageName of packageNames) {
    prepareNpmPackage(packageName);
  }
}

module.exports = {
  prepareNpmPackage,
  prepareNpmPackages,
};

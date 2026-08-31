"use strict";

const path = require("path");
const rollup = require("rollup");
const typescript = require("@rollup/plugin-typescript");
const resolve = require("@rollup/plugin-node-resolve").default;
const commonjs = require("@rollup/plugin-commonjs");

const { bundles, bundleTypes } = require("./bundles");

const { NODE_DEV, NODE_PROD, ESM_DEV, ESM_PROD, BROWSER_SCRIPT } = bundleTypes;

function isProduction(type) {
  return type === NODE_PROD || type === ESM_PROD;
}

function isESM(type) {
  return type === ESM_DEV || type === ESM_PROD;
}

// 对照官方 build.js 的 getFormat：BROWSER_SCRIPT 对应 iife（<script> 直接引入、挂全局变量）
function getFormat(type) {
  if (type === BROWSER_SCRIPT) {
    return "iife";
  }
  return isESM(type) ? "esm" : "cjs";
}

function getFilename(bundle, type) {
  if (type === BROWSER_SCRIPT) {
    return `${bundle.name}.development.js`;
  }
  const suffix = isProduction(type) ? "production" : "development";
  const ext = isESM(type) ? "esm" : "cjs";
  return `${bundle.name}.${ext}.${suffix}.js`;
}

async function buildBundle(bundle, type) {
  const inputOptions = {
    input: path.resolve(process.cwd(), bundle.entry),
    external: bundle.externals || [],
    plugins: [
      resolve({ extensions: [".ts", ".tsx", ".js"] }),
      commonjs(),
      typescript({
        tsconfig: path.resolve(process.cwd(), "tsconfig.json"),
        declaration: false,
        composite: false,
      }),
    ],
  };

  const outputOptions = {
    file: path.resolve(
      process.cwd(),
      "packages",
      bundle.packageName,
      "npm",
      getFormat(type),
      getFilename(bundle, type),
    ),
    format: getFormat(type),
    exports: "named",
    // iife 格式需要 name 才能把 exports 挂到全局变量上（如 window.React）
    name: type === BROWSER_SCRIPT ? bundle.global : undefined,
  };

  const build = await rollup.rollup(inputOptions);
  await build.write(outputOptions);
}

async function main() {
  if (bundles.length === 0) {
    console.log("No bundles configured in scripts/rollup/bundles.js yet.");
    return;
  }

  for (const bundle of bundles) {
    for (const type of bundle.bundleTypes) {
      await buildBundle(bundle, type);
      console.log(`built ${bundle.name} (${type})`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

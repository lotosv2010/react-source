"use strict";

// 对照官方 packages/react-reconciler/npm/reflection.js：独立入口，只按需引入 reflection 构建产物。
if (process.env.NODE_ENV === "production") {
  module.exports = require("./cjs/react-reconciler-reflection.production.min.js");
} else {
  module.exports = require("./cjs/react-reconciler-reflection.development.js");
}

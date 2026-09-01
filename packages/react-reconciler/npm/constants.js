"use strict";

// 对照官方 packages/react-reconciler/npm/constants.js：独立入口，只按需引入 constants 构建产物。
if (process.env.NODE_ENV === "production") {
  module.exports = require("./cjs/react-reconciler-constants.production.min.js");
} else {
  module.exports = require("./cjs/react-reconciler-constants.development.js");
}

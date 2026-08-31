"use strict";

// 对照官方 packages/react/npm/jsx-dev-runtime.js：手写、git 跟踪的分发文件。
if (process.env.NODE_ENV === "production") {
  module.exports = require("./cjs/react-jsx-dev-runtime.production.min.js");
} else {
  module.exports = require("./cjs/react-jsx-dev-runtime.development.js");
}

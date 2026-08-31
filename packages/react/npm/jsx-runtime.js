"use strict";

// 对照官方 packages/react/npm/jsx-runtime.js：手写、git 跟踪的分发文件。
if (process.env.NODE_ENV === "production") {
  module.exports = require("./cjs/react-jsx-runtime.production.min.js");
} else {
  module.exports = require("./cjs/react-jsx-runtime.development.js");
}

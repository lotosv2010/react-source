"use strict";

// 对照官方 packages/scheduler/npm/index.js：手写的、git 跟踪的分发文件，
// 根据 NODE_ENV 决定 require 哪个 rollup 构建产物（同级 cjs/ 目录下，构建产物不纳入 git）。
if (process.env.NODE_ENV === "production") {
  module.exports = require("./cjs/scheduler.production.min.js");
} else {
  module.exports = require("./cjs/scheduler.development.js");
}

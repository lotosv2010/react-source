"use strict";

// 对照官方 packages/react-dom/npm/client.js：独立子路径入口，转出主入口的客户端 API。
// 简版直接转发 index.js（官方会按需引入 react-dom-client bundle，本仓库暂不拆分）。
module.exports = require("./index.js");

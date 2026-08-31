# react-source

## 项目定位

个人学习/实现项目，目标是手写还原 React 18 源码的主链路和核心 API，做到与官方实现 **1:1 对照**（架构、模块划分、核心算法逐一还原，不是"写一个简化版 React"）。

代码组织方式尽量贴近官方仓库 [facebook/react](https://github.com/facebook/react)，方便随时对照源码。

## 技术栈与目录结构

- 语言：TypeScript
- 包管理：pnpm workspace（monorepo）
- 目录结构参照官方 `packages/` 划分，按需逐步搭建，典型包括：
  - `packages/react` — React 核心 API（createElement、Component、hooks 入口等）
  - `packages/react-dom` — DOM 渲染器
  - `packages/react-reconciler` — 协调器（Fiber、diff、commit）
  - `packages/scheduler` — 调度器（时间切片、优先级）
  - `packages/shared` — 跨包共享的工具函数、常量、类型

> 当前仓库刚初始化，尚未创建以上目录，后续按开发进度逐个搭建，不提前铺摊子。

## 开发约定

- **对照优先**：实现任何功能前，先看官方源码对应实现，理解其设计意图，再动手还原，不凭记忆或直觉编造实现。
- **命名对齐**：变量名、函数名、文件名尽量与官方源码保持一致，方便对照和检索。
- **注释**：只在还原关键算法/设计取舍时写注释说明"为什么官方这么做"，不写"这段代码做了什么"的样板注释。
- **不做官方没有的抽象**：不引入官方源码中不存在的分层、封装或配置项，保持实现的可对照性。
- **渐进式搭建**：按 React 渲染链路的自然顺序推进（如 createElement → Fiber 树构建 → 调度 → commit → hooks），不一次性铺全部模块骨架。
- **commit message 用中文**：遵循 Conventional Commits 格式（`type: 描述`），描述部分用中文写，由 commitlint + husky 的 `commit-msg` hook 校验。

## 当前状态

monorepo 骨架已搭建：

- 根目录：`package.json`、`pnpm-workspace.yaml`、`tsconfig.json`、`eslint.config.js`、`turbo.json`
- 工具链：ESLint + Prettier（lint/格式化）、Husky + lint-staged + commitlint（提交检查）、Rollup（构建）
- `packages/shared` 已建包占位（跨包共享工具/常量/类型，目前有 `objectIs`）
- `packages/react` 已建包，产出 `index.ts` 入口，构建脚本可产出 cjs/esm（dev+prod）和 iife 三种格式的 bundle
- 常用命令：`pnpm lint` / `pnpm lint:fix`、`pnpm format` / `pnpm format:check`、`pnpm build`、`npx tsc --noEmit`

`react-dom` / `react-reconciler` / `scheduler` 等包尚未创建，按渲染链路推进顺序逐个搭建。

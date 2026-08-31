# react-source

React 18 源码的个人还原实现。目标是照着官方仓库 [facebook/react](https://github.com/facebook/react) 1:1 还原主链路和核心 API（架构、模块划分、核心算法逐一对照），不是写一个简化版 React。

## 技术栈

- TypeScript
- pnpm workspace（monorepo）
- ESLint 8 + Prettier

## 目录结构

参照官方 `packages/` 划分，按渲染链路推进顺序逐步搭建：

- `packages/shared` — 跨包共享的工具函数、常量、类型
- `packages/react` — React 核心 API（createElement、Component、hooks 入口等）（待搭建）
- `packages/react-reconciler` — 协调器（Fiber、diff、commit）（待搭建）
- `packages/react-dom` — DOM 渲染器（待搭建）
- `packages/scheduler` — 调度器（时间切片、优先级）（待搭建）

## 常用命令

```bash
pnpm install

# lint
pnpm lint
pnpm lint:fix

# 格式化
pnpm format
pnpm format:check

# 类型检查
npx tsc --noEmit
```

## 开发约定

详见 [CLAUDE.md](./CLAUDE.md)。

# react-source

React 18 源码的个人还原实现。目标是照着官方仓库 [facebook/react](https://github.com/facebook/react) 1:1 还原主链路和核心 API（架构、模块划分、核心算法逐一对照），不是写一个简化版 React。

## 技术栈

- TypeScript
- pnpm workspace（monorepo）
- ESLint 10 + Prettier
- Rollup（构建）+ Turbo（任务编排）
- Husky + lint-staged + commitlint（提交检查）

## 目录结构

参照官方 `packages/` 划分，按渲染链路推进顺序逐步搭建：

```
react-source/
├── packages/
│   ├── shared/                # 跨包共享的工具函数、常量、类型
│   │   ├── CheckStringCoercion.ts      # DEV 模式下的字符串强制转换检查（key 等）
│   │   ├── getComponentNameFromType.ts # 从组件类型提取显示名称（用于警告信息）
│   │   ├── globals.d.ts                # 全局类型声明（__DEV__ 等构建时常量）
│   │   ├── hasOwnProperty.ts           # Object.prototype.hasOwnProperty 安全引用
│   │   ├── objectIs.ts                 # Object.is polyfill（兼容旧环境）
│   │   ├── ReactSymbols.ts             # React 内部 Symbol 常量（ELEMENT/FRAGMENT/PORTAL/PROVIDER/CONTEXT/FORWARD_REF/SUSPENSE/MEMO/LAZY 等）
│   │   └── ReactTypes.ts               # React 核心类型定义（Key/Ref/Props/ElementType）
│   │
│   ├── react/                 # React 核心 API（createElement、hooks 入口等）
│   │   └── src/
│   │       ├── jsx/
│   │       │   ├── ReactJSX.ts         # JSX automatic runtime 统一导出（jsx/jsxs/jsxDEV）
│   │       │   └── ReactJSXElement.ts  # JSX automatic runtime 的 ReactElement 工厂实现
│   │       ├── index.ts                # React 主入口（导出 createElement 等经典 API）
│   │       ├── jsx-dev-runtime.ts      # babel automatic runtime 开发环境入口
│   │       ├── jsx-runtime.ts          # babel automatic runtime 生产环境入口
│   │       ├── ReactCurrentOwner.ts    # 记录当前正在构建的组件（Fiber owner）
│   │       ├── ReactElement.ts         # ReactElement 工厂和经典 createElement 实现
│   │       └── ReactSharedInternals.ts # React 内部共享状态（聚合 CurrentOwner 等）
│   │
│   ├── react-reconciler/      # 协调器（Fiber、diff、commit）（同步主链路已搭建）
│   │   ├── index.ts                    # 主入口（转出 createContainer/updateContainer 等）
│   │   ├── constants.ts                # 常量入口（转出 LegacyRoot/ConcurrentRoot）
│   │   ├── reflection.ts               # Fiber 树反射入口（findCurrentHostFiber 等）
│   │   └── src/
│   │       ├── ReactFiber.ts           # Fiber 节点数据结构 + 双缓存 createWorkInProgress
│   │       ├── ReactChildFiber.ts      # ChildFiber 协调器（单/多节点 diff）
│   │       ├── ReactFiberBeginWork.ts  # beginWork（递阶段，按 tag 分发）
│   │       ├── ReactFiberCompleteWork.ts # completeWork（归阶段，创建 DOM + bubbleProperties）
│   │       ├── ReactFiberCommitWork.ts # commit mutation（插入/更新/删除）
│   │       ├── ReactFiberWorkLoop.ts   # 调度入口 + workLoop + commit 总控（同步）
│   │       ├── ReactFiberClassUpdateQueue.ts # 更新队列（Update 循环链表）
│   │       ├── ReactFiberHostConfig.ts # HostConfig 接口（setHostConfig 运行时注入）
│   │       ├── ReactFiberLane.ts       # Lane 优先级模型（当前仅 SyncLane）
│   │       ├── ReactFiberRoot.ts       # FiberRootNode / createFiberRoot
│   │       ├── ReactFiberFlags.ts      # 副作用标记位掩码
│   │       ├── ReactFiberReconciler.ts # 对外入口（createContainer/updateContainer）
│   │       └── ...                     # WorkTags/RootTags/TypeOfMode 等常量
│   │
│   ├── react-dom/             # DOM 渲染器（待搭建）
│   └── scheduler/             # 调度器（时间切片、优先级）（待搭建）
│
├── scripts/                   # 构建脚本
│   ├── rollup/
│   │   ├── build.js           # Rollup 打包入口
│   │   ├── bundles.js         # bundle 描述（react/reconciler 等包的打包配置）
│   │   └── packaging.js       # 打包辅助
│   └── vite/
│       └── vite.config.mts    # fixtures 源码调试配置（alias 到 packages 源码）
│
├── fixtures/                  # 源码调试演示页（pnpm dev）
│   ├── main.tsx               # 入口（当前仅 console.log 验证 JSX）
│   ├── index.html
│   └── jsx/
│       └── index.tsx          # JSX Demo 组件
│
├── .husky/                    # Git hooks（pre-commit、commit-msg）
├── eslint.config.js           # ESLint 配置
├── .prettierrc.js             # Prettier 配置
├── tsconfig.json              # TypeScript 配置
├── turbo.json                 # Turbo 任务编排配置
└── pnpm-workspace.yaml        # pnpm workspace 配置
```

### 重要文件说明

**packages/react/src/ReactElement.ts**  
React 元素的核心工厂函数，包含 `createElement`（经典运行时入口）和 `jsx/jsxDEV`（此文件版本不对外导出，是历史遗留拷贝）。

**packages/react/src/jsx/ReactJSXElement.ts**  
babel automatic runtime 实际使用的 JSX 工厂实现，通过 `ReactSharedInternals` 获取 owner 以支持跨包单例共享。

**packages/shared/ReactSymbols.ts**  
使用 `Symbol.for` 定义 React 内部标识符（`REACT_ELEMENT_TYPE`、`REACT_FRAGMENT_TYPE`、`REACT_PORTAL_TYPE`、`REACT_CONTEXT_TYPE`、`REACT_SUSPENSE_TYPE`、`REACT_MEMO_TYPE`、`REACT_LAZY_TYPE` 等，按后续 Phase 用得到的子集逐步补充），保证多份 React 实例间能互认。

**packages/shared/globals.d.ts**  
声明构建时注入的全局常量（`__DEV__`），实际值由 Rollup 的 `@rollup/plugin-replace` 在打包时替换。

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

# 构建（输出 cjs / esm / iife 三种产物）
pnpm build
```

## 提交规范

commit message 使用中文描述，遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式（`type: 描述`），由 commitlint 校验。

## 开发约定

详见 [CLAUDE.md](./CLAUDE.md)。

# React 核心主线

本文档梳理 React 18 的核心渲染主线，帮助在实现过程中始终对照官方架构，理解各模块之间的关系。

## 一句话概括

React 的渲染主线是：**JSX 描述 UI → 生成 Fiber 树（协调/diff）→ 生成副作用列表 → commit 到真实 DOM**。整个过程围绕 **Fiber** 这一数据结构展开，调度器负责决定"什么时候做"，协调器负责决定"要做什么"，渲染器负责决定"怎么落地到具体平台"。

## 分层架构

```
┌─────────────────────────────────────────────────────────┐
│  React 核心 API（packages/react）                          │
│  createElement / jsx / Component / hooks 入口（useState等） │
│  只负责描述"要渲染什么"，不关心"怎么渲染"                        │
└─────────────────────────────────────────────────────────┘
                          │ ReactElement（虚拟 DOM 描述）
                          ▼
┌─────────────────────────────────────────────────────────┐
│  协调器（packages/react-reconciler）                        │
│  Fiber 树构建、diff 算法、优先级调度接入、commit 副作用应用       │
│  平台无关，通过 HostConfig 接口与具体渲染器解耦                  │
└─────────────────────────────────────────────────────────┘
                          │ HostConfig（createInstance/appendChild等）
                          ▼
┌─────────────────────────────────────────────────────────┐
│  渲染器（packages/react-dom / react-native 等）              │
│  实现 HostConfig，把 Fiber 的变更落地到具体平台                 │
│  react-dom → 操作浏览器 DOM API                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  调度器（packages/scheduler）                                │
│  独立于 React，通用的任务调度库（优先级 + 时间切片）               │
│  被 reconciler 用来决定何时执行渲染任务、能否被中断              │
└─────────────────────────────────────────────────────────┘
```

**关键设计**：reconciler 与渲染器解耦（HostConfig 抹平平台差异），reconciler 与 scheduler 解耦（scheduler 是通用调度库，不感知 Fiber）。这是 React 能同时支持 DOM/Native/自定义渲染器的架构基础。

## 核心概念

### 1. ReactElement —— UI 的静态描述

```ts
{
  $$typeof: (REACT_ELEMENT_TYPE, type, key, ref, props);
}
```

- 由 `createElement`/`jsx` 产出，是不可变的普通对象（DEV 下会 `Object.freeze`）
- 只是"描述"，不包含任何实例状态，每次 render 都会重新创建
- 对应本项目 `packages/react/src/ReactElement.ts`

### 2. Fiber —— 可中断工作单元 + 实例状态载体

Fiber 是 React 16 引入的核心数据结构，取代了 React 15 的递归 Stack Reconciler。每个 ReactElement 对应一个 Fiber 节点，Fiber 节点组成一棵树（通过 `child`/`sibling`/`return` 指针，而非数组，这样才能做到可中断后精确恢复）。

```ts
FiberNode {
  tag,              // 节点类型：HostComponent/FunctionComponent/ClassComponent...
  type,             // 对应 ReactElement.type
  key, ref, props,
  stateNode,        // 对应的真实实例：DOM 节点 / class 组件实例 / FiberRoot
  return,           // 指向父 Fiber
  child, sibling,   // 指向第一个子 Fiber / 下一个兄弟 Fiber
  alternate,        // 指向双缓存树中对应的另一棵树的节点（current ↔ workInProgress）
  flags,            // 副作用标记：Placement/Update/Deletion...
  memoizedState,    // 上次渲染的 state（函数组件是 Hook 链表，class 组件是 this.state）
  updateQueue,      // 待处理的更新队列
}
```

**为什么用链表而非递归**：Stack Reconciler 用递归遍历树，一旦开始无法中断（JS 调用栈无法从中间恢复）。Fiber 用链表模拟调用栈，每处理完一个节点就把进度保存在 Fiber 上，可以随时中断、把控制权交还浏览器、之后再从中断点继续 —— 这是实现"时间切片"的前提。

**双缓存**：同一时刻存在两棵 Fiber 树：

- `current`：对应当前屏幕上显示的内容
- `workInProgress`：正在构建的新树

两棵树通过 `alternate` 指针互相引用，构建完成后直接替换根指针（`current = workInProgress`），而不是逐节点替换 DOM，这样即使渲染中途出错也不会影响已显示的内容。

对应本项目 `packages/react-reconciler/src/ReactFiber.ts`（已实现）。

### 3. render 阶段 vs commit 阶段

React 的一次更新分两大阶段：

|          | render 阶段                                  | commit 阶段                                       |
| -------- | -------------------------------------------- | ------------------------------------------------- |
| 做什么   | 构建 workInProgress Fiber 树，标记副作用     | 把副作用应用到真实 DOM                            |
| 能否中断 | 能（并发模式下可被打断，之后重新开始或恢复） | 不能（必须同步执行完，否则用户会看到不一致的 UI） |
| 核心函数 | beginWork（向下）/ completeWork（向上）      | commitMutationEffects 等                          |
| 产出     | 带 flags 标记的 Fiber 树                     | 更新后的真实 DOM                                  |

**render 阶段的两个子阶段**（对每个 Fiber 节点）：

- **beginWork**（递，向下）：根据新的 props/state 决定这个节点要渲染成什么，创建/复用子 Fiber
  - HostComponent（如 `<div>`）→ 处理 children，创建子 Fiber
  - FunctionComponent → 执行函数得到 children
  - 通过 diff 算法（reconcileChildren）对比新旧子节点，标记 Placement/Update/Deletion
- **completeWork**（归，向上）：子树处理完后，为当前节点做收尾
  - HostComponent → 创建/更新真实 DOM 节点（但不挂到文档上）
  - 把子树的副作用标记向上冒泡收集（bubbleProperties），最终在根节点形成完整的副作用链

**commit 阶段的三个子阶段**：

1. **before mutation**：DOM 变更前（如 class 组件的 getSnapshotBeforeUpdate）
2. **mutation**：真正操作 DOM（根据 flags 执行 appendChild/removeChild/更新属性）
3. **layout**：DOM 变更后（如 class 组件的 componentDidMount/DidUpdate，ref 赋值）

### 4. 调度与优先级（Lane 模型）

不同来源的更新有不同的紧迫程度：

- 用户直接交互（点击、输入）→ 需要同步或高优先级响应
- 数据请求返回后的更新 → 可以稍后处理
- `useTransition` 标记的过渡更新 → 优先级最低，可被打断

React 用 **Lane**（31 位二进制位）表示优先级，每个更新会被分配到某个 lane，多个更新可以合并处理。高优先级更新到来时，会打断正在进行的低优先级渲染，优先处理紧急的。

Scheduler（独立包）不理解 Lane，只提供通用的"按优先级执行回调，且可被打断"的能力（内部用 `MessageChannel` 模拟宏任务，配合 `shouldYield` 判断是否让出主线程）。reconciler 把 Lane 映射到 Scheduler 的优先级常量，桥接两者。

### 5. Hooks 的本质

Hooks 不是魔法，本质是：

- **链表**：一个函数组件对应的 Fiber 上挂一条 Hook 链表（`fiber.memoizedState`），`useState`/`useEffect` 等每次调用按顺序对应链表上的一个节点
- **约定**：Hooks 调用顺序必须稳定（不能在条件/循环中调用），因为 React 是靠"第几次调用"而非变量名去对应链表节点的 —— 这也是为什么不能在条件语句中调用 Hooks
- **Dispatcher 切换**：`useState` 等函数本身只是转发调用给 `ReactCurrentDispatcher.current.useState`，mount 和 update 阶段指向不同的实现（mountState 创建节点，updateState 复用节点算新值），组件重渲染时通过切换 dispatcher 区分行为

## 本项目当前进度

对照 [roadmap.md](./roadmap.md)，当前已实现：

- **最上层（JSX → ReactElement）**：`packages/react` 的 createElement/jsx/jsxDEV + jsx-runtime/jsx-dev-runtime 入口，架构图中 "React 核心 API" 这一层已完成。
- **reconciler 主链路（同步路径）**：`packages/react-reconciler` 已具备 Fiber 数据结构、双缓存、更新队列、beginWork/completeWork、commit mutation、单/多节点 diff、Fragment、单 lane 模型，以及 `setHostConfig` 运行时注入的 HostConfig 接口。

尚未落地（也是下一步方向）：

- **渲染器层**：`react-dom` 尚未创建，HostConfig 没有真实 DOM 实现注入，因此还无法把 Fiber 变更落地到浏览器 DOM。
- **调度器层**：`scheduler` 尚未创建，workLoop 目前是同步一口气跑完（单 SyncLane），还没有时间切片 / 完整 Lane 模型 / 优先级抢占。
- **Hooks 层**：`ReactFiberHooks` 尚未创建，函数组件的 renderWithHooks 是占位实现（直接调用 Component），还没有 useState/useEffect 等。

即：架构图中"协调器"这一层的主链路已经打通，但"渲染器"和"调度器"两层还是空的，"协调器"与它们对接的部分（ensureRootIsScheduled、可中断 workLoop、并发更新状态计算）也随之后续补齐。详细分 Phase 进度见 [roadmap.md](./roadmap.md)。

## 参考资料

- React 官方仓库：https://github.com/facebook/react
- Fiber 架构设计文档（React 团队）：https://github.com/acdlite/react-fiber-architecture
- Big-React（卡颂）：https://github.com/BetaSu/big-react
- React技术揭秘（卡颂）：https://react.iamkasong.com/

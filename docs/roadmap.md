# React 源码实现路线图

本文档描述 react-source 项目的功能实现路径，按 React 18 的渲染主链路自然顺序逐步搭建核心模块。

## 已完成

### Phase 1: JSX / createElement

- [x] **packages/shared** 基础设施
  - ReactTypes（Key/Ref/Props/ElementType 类型定义）
  - ReactSymbols（REACT_ELEMENT_TYPE/REACT_FRAGMENT_TYPE 等 Symbol）
  - 工具函数（hasOwnProperty、objectIs、checkKeyStringCoercion、getComponentNameFromType）

- [x] **packages/react** JSX 运行时
  - ReactElement 工厂函数（createElement/jsx/jsxDEV）
  - ReactCurrentOwner（记录当前正在构建的组件，为 reconciler 铺垫）
  - 两套入口：
    - **经典入口**（react）：`createElement`
    - **automatic runtime 入口**（react/jsx-runtime、react/jsx-dev-runtime）：`jsx/jsxs/jsxDEV`
  - DEV 模式警告（字符串 ref 警告、key/ref 作为 prop 访问警告）
  - 标识注入（`__react_source: "g-react-source"`，方便控制台区分）
  - Rollup 构建产出 cjs/esm（dev+prod）和 iife 格式 bundle

### Phase 2/3（部分）: Reconciler 主链路 + 更新与 Diff

> 说明：reconciler 的骨架和主链路已经落地，走的是「同步渲染」路径（单 lane）。react-dom 渲染器本身尚未搭建（见 Phase 2 剩余部分）。

- [x] **Fiber 数据结构**（`packages/react-reconciler/src/ReactFiber.ts`）
  - FiberNode 字段完整对齐官方（tag/key/elementType/type/stateNode/return/child/sibling/flags/subtreeFlags/lanes/childLanes/alternate…）
  - createFiber / createFiberFromElement / createFiberFromText / createFiberFromFragment / createHostRootFiber
  - createWorkInProgress 双缓存（惰性创建 alternate、复用并重置字段）

- [x] **常量体系**
  - ReactWorkTags（0~8：FunctionComponent/ClassComponent/IndeterminateComponent/HostRoot/HostPortal/HostComponent/HostText/Fragment/Mode）
  - ReactFiberFlags（主链路用得到的 Placement/Update/ChildDeletion/ContentReset/PerformedWork/Incomplete/DidCapture 等，数值与官方逐位对齐）
  - ReactFiberLane（**仅 SyncLane 一条**，位运算助手 mergeLanes/includesSomeLane/isSubsetOfLanes/removeLanes 齐备）
  - ReactRootTags（LegacyRoot/ConcurrentRoot）、ReactTypeOfMode（NoMode/ConcurrentMode）

- [x] **更新队列**（`ReactFiberClassUpdateQueue.ts`）
  - Update / UpdateQueue / SharedQueue 数据结构（单向循环链表）
  - createUpdate / enqueueUpdate / processUpdateQueue / cloneUpdateQueue / initializeUpdateQueue
  - markUpdateLaneFromFiberToRoot（lane 冒泡到根，支撑 beginWork 的 bailout 判断）

- [x] **FiberRoot 与对外入口**
  - FiberRootNode / createFiberRoot（`ReactFiberRoot.ts`）
  - createContainer / updateContainer（`ReactFiberReconciler.ts`）

- [x] **workLoop**（`ReactFiberWorkLoop.ts`）
  - scheduleUpdateOnFiber → renderRootSync → workLoopSync（同步一口气跑完，不可中断）
  - prepareFreshStack / performUnitOfWork / completeUnitOfWork
  - commitRoot **精简为只有 mutation 子阶段**（before-mutation / layout 留待后续）

- [x] **beginWork**（`ReactFiberBeginWork.ts`）
  - HostRoot / HostComponent / HostText / Fragment / Mode / FunctionComponent / IndeterminateComponent 全部分发
  - 基础 bailout：bailoutOnAlreadyFinishedWork + attemptEarlyBailoutIfNoScheduledUpdate + didReceiveUpdate（props/state 不变跳过子树）
  - renderWithHooks 目前是占位（直接 `Component(props)`，Hooks 见 Phase 5）

- [x] **completeWork**（`ReactFiberCompleteWork.ts`）
  - HostComponent：createInstance / appendAllChildren / finalizeInitialChildren
  - HostText：createTextInstance
  - updateHostComponent（prepareUpdate 生成 updatePayload 标记 Update）、updateHostText
  - bubbleProperties（子树 flags/lanes 向上汇总）

- [x] **commit mutation**（`ReactFiberCommitWork.ts`）
  - Placement（insertOrAppendPlacementNode，含 getHostSibling 锚点定位）
  - Update（commitUpdate / commitTextUpdate）
  - Deletion（递归卸载子树）
  - 错误边界 / effect 卸载 / Portal 分支留待后续

- [x] **Diff 算法**（`ReactChildFiber.ts`）
  - 单节点 diff（reconcileSingleElement）、单文本 diff（reconcileSingleTextNode）
  - 多节点 diff（reconcileChildrenArray：头部逐位匹配 → 剩余全新建/全删除 → mapRemainingChildren Map 查找）
  - placeChild lastPlacedIndex 移动标记、key 匹配
  - mountChildFibers（不标记副作用）vs reconcileChildFibers（标记副作用）工厂

- [x] **HostConfig 接口**（`ReactFiberHostConfig.ts`）
  - 平台无关接口，**构建时 fork 注入**（对齐官方 forks/ReactFiberHostConfig.custom.js）
  - 占位模块每个导出都 throw，react-dom 构建时把它替换成 `ReactDOMHostConfig`（reconciler 自身仍以 shim 打包）

- [x] **react-dom 简版**（`packages/react-dom`）
  - `createRoot(container).render(element)`：ReactDOMClient → ReactDOMRoot，底层走 reconciler 的 createContainer/updateContainer
  - DOM HostConfig（`ReactDOMHostConfig.ts`）：createInstance/createTextInstance、className/style/普通属性子集、prepareUpdate/commitUpdate、appendChild/insertBefore/removeChild 等
  - npm 分发文件夹 + rollup 构建产物（cjs dev/prod），bundles.js 注册 react-dom bundle，build.js fork 注入 HostConfig
  - 简版边界：不含 hydrate / legacy render / 事件系统 / shouldSetTextContent 优化 / DOMPropertyOperations 完整体系，留待后续 Phase

- [x] **Fragment**（beginWork / completeWork / ChildFiber / ReactFiber 均已处理 `REACT_FRAGMENT_TYPE`）

**当前能做什么**：可以创建 ReactElement 对象，有一套完整（同步）的 reconciler 主链路——`createContainer/updateContainer` → `workLoopSync` → `commit mutation`，能对 Fiber 树做挂载、单/多节点 diff、更新、删除；并通过 react-dom 简版的 `createRoot().render()` 把结果渲染到真实 DOM（HostConfig 由构建时 fork 注入）。`fixtures/` 用 react-dom 驱动 reconciler 调试，`pnpm dev` 可看到挂载与二次更新的 DOM 变化。

## 待实现

### Phase 2（简版已完成）: react-dom 包 + 真实 DOM 渲染

> **简版已落地**：`ReactDOM.createRoot(container).render(<App />)` 已能渲染到真实 DOM（见上文「已完成」的 react-dom 简版条目）。以下 2.1/2.2 已按简版完成，2.3 调试方式已具备；后续 Phase 补齐 hydrate、legacy render、事件系统与 DOMPropertyOperations 完整体系。

#### 2.1 创建 react-dom 包 ✅（简版）

- 入口文件 `packages/react-dom/index.ts` / `react-dom/client`
  - `createRoot(container, options?)` → 返回 ReactDOMRoot 实例
  - ReactDOMRoot.render(element) → 调用 reconciler 的 createContainer/updateContainer

#### 2.2 注入真实 DOM HostConfig ✅（简版）

- 把 `ReactFiberHostConfig` 的接口实现成 DOM 版本并**构建时 fork 注入**（对齐官方 forks.js）：
  - createInstance → `document.createElement`；createTextInstance → `document.createTextNode`
  - setInitialProperties / finalizeInitialChildren（className、style、children 等属性设置）
  - prepareUpdate / commitUpdate（updatePayload 扁平数组消费，DOM 属性 diff）
  - appendChild / insertBefore / removeChild 等
- 简版边界：事件 on* 忽略、shouldSetTextContent 恒 false、布尔属性/dangerouslySetInnerHTML 留待后续 Phase

#### 2.3 调试方式 ✅

- 第一种调试方式（JSX 验证）已具备：`fixtures/` + `scripts/vite/vite.config.mts`（alias 到源码，清空 optimizeDeps 保证改源码即热更）
- 第二种调试方式（reconciler 调试）已具备：`fixtures/reconciler/` 用 react-dom 的 createRoot 驱动挂载/更新/diff，在 workLoop/commit 关键节点埋点或断点，观察 Fiber 树构建与 DOM 变更（对应课程 016）

**阶段目标验收**：运行 `pnpm dev`，页面显示 "Hello, React!"

```tsx
import { jsx } from "react/jsx-runtime";
import ReactDOM from "react-dom/client";

const App = jsx("div", { children: "Hello, React!" });
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(App);
```

---

### Phase 4: 调度器（Scheduler）+ 时间切片 + 完整 Lane 模型

**目标**：实现可中断的渲染，避免长时间占用主线程导致卡顿。当前只有 SyncLane + 同步 workLoop，需要补 scheduler 包和完整优先级体系。

#### 4.1 创建 scheduler 包

- `packages/scheduler/src/forks/Scheduler.ts`
  - scheduleCallback(priority, callback) → 注册回调任务
  - 基于 MessageChannel（或 setTimeout fallback）实现宏任务调度
  - 最小堆管理任务队列（按 expirationTime 排序）
  - shouldYieldToHost() → 判断当前帧是否还有剩余时间（5ms 阈值）

#### 4.2 展开完整 Lane 模型

- 当前 `ReactFiberLane.ts` 只有 SyncLane，补齐：
  - SyncLane / InputContinuousLane / DefaultLane / TransitionLane / IdleLane / OffscreenLane…
  - getHighestPriorityLane / getNextLanes / markRootUpdated 等优先级计算
  - lane 过期时间（expirationTime）与饥饿防饿死

#### 4.3 reconciler 接入 Scheduler

- scheduleUpdateOnFiber 改造为 `ensureRootIsScheduled`
  - 根据 lane 选择调度方式：同步更新（离散事件/flushSync）→ performSyncWorkOnRoot；并发更新 → Scheduler.scheduleCallback(performConcurrentWorkOnRoot)
  - 补 executionContext 的 BatchedContext / EventContext（批处理与事件系统也依赖它）

#### 4.4 workLoop 可中断化

- `workLoopConcurrent` 每次处理一个 Fiber 后检查 `shouldYield()`
  - 有剩余时间 → 继续；时间用完 → 中断保存进度（workInProgressRoot），yield 给浏览器
  - 下一帧从中断点恢复（prepareFreshStack 的复用分支目前直接断言，需补齐）

#### 4.5 并发更新下的状态计算

- processUpdateQueue 按 renderLanes 跳过/合并低优先级 update（当前是单 lane 无跳过分支）
- baseState/baseUpdate 重放逻辑：高优先级打断后，被跳过的低优先级 update 记录到 base 队列，下次渲染重放（对应课程 041-042）

**阶段目标验收**：DevTools Profiler 中观察到渲染任务被分片执行，不阻塞用户输入。

---

### Phase 5: Hooks

**目标**：支持函数组件的状态管理和副作用（useState、useEffect 等）。

#### 5.1 Hook 数据结构

- `packages/react-reconciler/src/ReactFiberHooks.ts`
  - Hook 链表挂在 Fiber.memoizedState 上
  - 每个 Hook 节点：memoizedState（当前值）、queue（更新队列）、next（链表指针）

#### 5.2 Dispatcher 切换机制

- ReactCurrentDispatcher（shared/ReactSharedInternals 目前只有 ReactCurrentOwner，需补）
  - HooksDispatcherOnMount / HooksDispatcherOnUpdate / InvalidNestedHooksDispatcher
  - renderWithHooks 替换占位实现（切换 Dispatcher、建立 Hook 链表、设置 ReactCurrentOwner）

#### 5.3 核心 Hooks 实现

- **useState**：mountState / updateState / dispatchSetState（创建 update、加入 queue、调度更新）
- **useEffect**：mountEffect / updateEffect（deps 对比、标记 Passive flag）
  - commit 阶段异步执行 flushPassiveEffects：先执行 destroy 清理，再执行 create，缓存 destroy
  - 补 commitRoot 的 before-mutation / layout 子阶段（Passive effect 的调度入口）
- **useRef**：mountRef 创建 { current: initialValue }
- **useMemo / useCallback**：对比 deps，变化则重算，否则返回缓存值
- **useTransition**：startTransition 把更新标记为 TransitionLane，返回 isPending（对应课程 043-044）

#### 5.4 调试方式（第三种）

- hooks 调试：在 Dispatcher 切换 / Hook 链表构建处断点，观察 hook 状态变化（对应课程 019）

#### 5.5 noop-renderer（测试渲染器）

- 新建 `react-noop-renderer` 包（官方 packages/react-noop-renderer 对应用来测 reconciler 的宿主）
  - 实现一套不操作真实 DOM 的 HostConfig（内存树），配合 useEffect 等副作用做确定性测试（对应课程 035-037）

**阶段目标验收**：`useState` 管理状态并触发重渲染，`useEffect` 在 commit 后异步执行，且可通过 noop-renderer 单测断言副作用执行顺序。

---

### Phase 6: 事件系统

**目标**：实现合成事件（SyntheticEvent）和事件委托。

#### 6.1 事件插件系统

- `packages/react-dom/src/events/EventRegistry.ts`
  - 注册原生事件名到 React 事件名的映射（onClick → click）
  - 区分冒泡/捕获阶段（onClickCapture）

#### 6.2 事件委托（根节点监听）

- createRoot 时在 container 上注册所有支持的事件监听器（委托给根节点）
- 原生事件触发 → 收集从 target 到 root 的 Fiber 路径（getEventTarget）
- 模拟捕获/冒泡：遍历路径收集 props 上的事件回调，依次执行

#### 6.3 合成事件对象

- SyntheticEvent 包装原生 event，抹平浏览器差异
- 事件池复用（React 17 后已移除池化，本项目可对照早期实现学习）

#### 6.4 批量更新（事件回调中的 setState 自动批处理）

- 依赖 Phase 4.3 的 executionContext（BatchedContext/EventContext）
- 事件回调中的更新不立即 flush，收集到批次结束后统一 commit

**阶段目标验收**：能够监听 onClick、onChange 等事件，事件回调中多次 setState 只触发一次重渲染。

---

### Phase 7: Context API

#### 7.1 createContext / Provider / Consumer / useContext

- createContext(defaultValue) → { Provider, Consumer, _currentValue }
- Provider 组件：beginWork 时将 value 压入栈（pushProvider）
- 消费：函数组件 useContext(Context)，class 组件 contextType / Consumer

#### 7.2 context 变化时的传播与 bailout 兼容

- Provider 的 value 变化时，标记子树中所有消费该 context 的 Fiber 需要更新
- context 与 bailout 策略联动：无 context 消费时跳过子树渲染（基础 bailout 已实现，需补 dependencies 记录 context 依赖，对应课程 063）

**阶段目标验收**：Provider 更新 value 后，消费该 context 的子组件自动重渲染。

---

### Phase 8: Class 组件生命周期

#### 8.1 ClassComponent beginWork

- shouldConstruct（type.prototype 是否为 React.Component 子类）区分 class/function（当前 mountIndeterminateComponent 一律按函数组件定型）
- 实例化：new Component(props, context)
- 挂载阶段：constructor → getDerivedStateFromProps → render → componentDidMount
- 更新阶段：shouldComponentUpdate → render → getSnapshotBeforeUpdate → componentDidUpdate

#### 8.2 setState / forceUpdate

- 复用 ReactFiberClassUpdateQueue 的 Update 队列（回调 effect、forceUpdate 分支当前是空壳）

**阶段目标验收**：能够使用 class 组件，生命周期按正确顺序执行。

---

### Phase 9: 其他核心 API + 性能优化

#### 9.1 Suspense 完整实现（对应课程 049-055）

- 捕获 Promise throw，显示 fallback，Promise resolve 后重新渲染
- **unwind 流程**：渲染中断后的回退（completeUnitOfWork 的 Incomplete 分支当前留空，需补齐）
- **use（试验性 hook）**：Suspense 的触发入口
- 补 ReactSymbols 的 REACT_SUSPENSE_TYPE、ReactWorkTags 的 SuspenseComponent 等

#### 9.2 forwardRef / memo / lazy / Portal

- **forwardRef**：转发 ref 到子组件（需补 markRef、coerceRef 字符串 ref 自动转换、Ref flag 的 commit 处理）
- **memo**：浅比较 props，props 不变时跳过重渲染（需补 MemoComponent/SimpleMemoComponent tag 与 REACT_MEMO_TYPE）
- **lazy**：动态 import 组件，配合 Suspense 实现代码分割（需补 REACT_LAZY_TYPE）
- **Portal**：createPortal 将子树渲染到其他 DOM 节点（需补 HostPortal 的 commit 空壳分支）

#### 9.3 性能优化策略（对应课程 056-063）

- **eagerState**：dispatchSetState 时若 state 不变则提前 bailout，跳过整次调度（基础 bailout 已实现，eagerState 是 dispatch 侧优化）
- **React.memo / useMemo / useCallback**：与 bailout 联动的 props 浅比较（见 9.2 / Phase 5.3）

---

## 参考资料

- 官方仓库：https://github.com/facebook/react
- 对照文件路径：
  - react 核心：`packages/react/src/`
  - react-dom：`packages/react-dom/src/`
  - reconciler：`packages/react-reconciler/src/`
  - scheduler：`packages/scheduler/src/`

---

## 开发原则

1. **1:1 对照官方源码**：保持文件路径、函数命名、算法逻辑与官方一致
2. **渐进式实现**：先跑通主链路，再补边界 case 和优化
3. **注释说明意图**：只在关键算法处注释"为什么官方这么做"，不写样板注释
4. **验收标准清晰**：每个 Phase 结束都有可执行的示例代码验证功能正确性

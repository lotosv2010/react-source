# React 源码实现路线图

本文档描述 react-source 项目的功能实现路径，按 React 18 的渲染主链路自然顺序逐步搭建核心模块。

## 已完成

### Phase 1: JSX / createElement（当前）

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

**当前能做什么**：可以调用 `createElement(<div />)` 或 `jsx(<div />)` 得到 ReactElement 对象，但无法渲染到 DOM（缺 react-dom）。

## 待实现

### Phase 2: react-dom 入口 + 初始挂载（首屏渲染）

**目标**：实现 `ReactDOM.createRoot(container).render(<App />)`，让 JSX 能显示在页面上。

#### 2.1 创建 react-dom 包

- 入口文件 `packages/react-dom/index.ts`
  - `createRoot(container, options?)` → 返回 ReactDOMRoot 实例
  - ReactDOMRoot.render(element) → 调用 reconciler 创建 Fiber 树并提交

#### 2.2 搭建 react-reconciler（协调器核心）

- **Fiber 数据结构**（`packages/react-reconciler/src/ReactFiber.ts`）
  - FiberNode 类型定义（tag、type、key、ref、props、stateNode、return/child/sibling、flags 等）
  - createFiber/createFiberFromElement 工厂函数
  - HostRoot/HostComponent/FunctionComponent 等 WorkTag 枚举

- **初次渲染核心流程**
  - `createContainer` → 创建 FiberRootNode 和 HostRootFiber
  - `updateContainer` → 将 ReactElement 挂载到 rootFiber，标记更新
  - `scheduleUpdateOnFiber` → 触发调度（Phase 2 暂时同步执行，Phase 4 再接入 Scheduler 时间切片）

- **beginWork**（`ReactFiberBeginWork.ts`，Fiber 树构建 - 向下递阶段）
  - 针对不同 WorkTag 调用对应逻辑：
    - HostRoot：processUpdateQueue 计算新 state（即根节点的 element）
    - HostComponent（原生 DOM 标签）：创建子 Fiber（reconcileChildren）
    - FunctionComponent：执行函数拿到 children，创建子 Fiber
  - reconcileChildren：对比 current Fiber 和新 ReactElement，决定复用/新建/删除子 Fiber
    - Phase 2 初次挂载只需处理 Placement（插入）标记
    - Phase 3 更新时再补 diff 算法（key 匹配、单节点/多节点对比）

- **completeWork**（`ReactFiberCompleteWork.ts`，Fiber 树构建 - 向上归阶段）
  - HostComponent：调用 `createInstance(type, props)` 创建真实 DOM 节点，挂到 fiber.stateNode
  - 初次挂载时给所有祖先 Fiber 标记 Update flag（bubbleProperties）

#### 2.3 commit 阶段（将 Fiber 树变更应用到 DOM）

- **commitRoot**（`ReactFiberCommitWork.ts`）
  - Phase 2 只需实现 Placement 插入操作（遍历 effectList，调用 `appendChild/insertBefore`）
  - 三个子阶段：
    - before mutation：DOM 变更前的准备工作（Phase 2 可跳过）
    - mutation：执行 DOM 插入/更新/删除（Phase 2 只需 Placement）
    - layout：DOM 变更后的副作用（ref 赋值、生命周期回调，Phase 2 可跳过）

#### 2.4 HostConfig（渲染器与平台无关接口）

- `packages/react-reconciler/src/ReactFiberHostConfig.ts`
  - createInstance(type, props) → document.createElement(type) 并设置属性
  - appendInitialChild(parent, child) → parent.appendChild(child)
  - finalizeInitialChildren(instance, type, props) → 设置 DOM 属性（className、style、事件等）
  - Phase 2 只需实现初次挂载相关的方法，更新相关（updateProperties）等 Phase 3 补

**阶段目标验收**：能够运行以下代码并在页面看到 "Hello, React!"

```tsx
import { jsx } from "react/jsx-runtime";
import ReactDOM from "react-dom/client";

const App = jsx("div", { children: "Hello, React!" });
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(App);
```

---

### Phase 3: 更新与 Diff 算法

**目标**：支持多次 `root.render(newElement)` 触发更新，实现高效 diff 避免整树重建。

#### 3.1 双缓存 Fiber 树

- current 树（屏幕上显示的）vs. workInProgress 树（正在构建的）
- 初次挂载时创建 workInProgress，commit 后交换指针（workInProgress 变成 current）
- 更新时基于 current 克隆出新的 workInProgress

#### 3.2 Diff 算法（reconcileChildren 完整实现）

- **单节点 diff**（reconcileSingleElement）
  - 对比 key + type 判断是否复用旧 Fiber
  - 复用时标记 Update，否则标记 Placement（新建）+ Deletion（删除旧的）

- **多节点 diff**（reconcileChildrenArray）
  - 第一轮遍历：新旧数组头部逐一对比（key 相同则复用，不同则中断）
  - 第二轮遍历：处理剩余节点
    - 旧节点用完 → 新节点全部 Placement
    - 新节点用完 → 旧节点全部 Deletion
    - 都有剩余 → 旧节点建 Map（key → fiber），遍历新节点查 Map 决定复用/新建
  - 标记移动（lastPlacedIndex 算法判断节点是否需要移动）

#### 3.3 completeWork 更新分支

- HostComponent 更新时调用 `prepareUpdate(instance, type, oldProps, newProps)`
  - 对比新旧 props，生成 updatePayload（[key1, value1, key2, value2, ...]）
  - 标记 Update flag

#### 3.4 commit 阶段增强

- **mutation 阶段**
  - Placement：插入 DOM（已在 Phase 2 实现）
  - Update：调用 `commitUpdate(instance, updatePayload)` 更新 DOM 属性
  - Deletion：调用 `removeChild` 移除 DOM 节点（递归卸载子树）

**阶段目标验收**：能够连续调用 `root.render(element)` 多次，观察到 DOM 高效更新而非整树重建。

---

### Phase 4: 调度器（Scheduler）+ 时间切片

**目标**：实现可中断的渲染，避免长时间占用主线程导致卡顿。

#### 4.1 创建 scheduler 包

- `packages/scheduler/src/forks/Scheduler.ts`
  - scheduleCallback(priority, callback) → 注册回调任务
  - 基于 MessageChannel（或 setTimeout fallback）实现宏任务调度
  - 最小堆管理任务队列（按 expirationTime 排序）
  - shouldYieldToHost() → 判断当前帧是否还有剩余时间（5ms 阈值）

#### 4.2 reconciler 接入 Scheduler

- scheduleUpdateOnFiber 调用 `ensureRootIsScheduled`
  - 根据优先级（SyncLane/InputDiscreteLane/DefaultLane 等）选择调度方式
  - 同步更新（如 ReactDOM.flushSync）→ 直接调用 performSyncWorkOnRoot
  - 并发更新 → 通过 Scheduler.scheduleCallback 注册 performConcurrentWorkOnRoot

#### 4.3 workLoop 可中断化

- `workLoopConcurrent` 在每次处理一个 Fiber 后检查 `shouldYield()`
  - 有剩余时间 → 继续处理下一个 Fiber（beginWork/completeWork）
  - 时间用完 → 中断，保存当前进度（workInProgressRoot），yield 给浏览器
  - 下一帧继续从中断点恢复（Scheduler 重新调度回调）

#### 4.4 优先级体系

- Lane 模型（packages/react-reconciler/src/ReactFiberLane.ts）
  - SyncLane（最高优先级，如 flushSync、离散事件）
  - InputContinuousLane（连续输入，如 drag/scroll）
  - DefaultLane（普通更新）
  - TransitionLane（过渡更新，可被高优先级打断）
- 高优先级更新打断低优先级渲染（记录被跳过的 lanes，commit 后重新调度）

**阶段目标验收**：能够在 DevTools Profiler 中观察到渲染任务被分片执行，不阻塞用户输入。

---

### Phase 5: Hooks

**目标**：支持函数组件的状态管理和副作用（useState、useEffect 等）。

#### 5.1 Hook 数据结构

- `packages/react-reconciler/src/ReactFiberHooks.ts`
  - Hook 链表挂在 Fiber.memoizedState 上
  - 每个 Hook 节点包含：memoizedState（当前值）、queue（更新队列）、next（链表指针）

#### 5.2 Dispatcher 切换机制

- ReactCurrentDispatcher（shared/ReactSharedInternals.ts）
  - 不同阶段切换不同 Dispatcher 实现：
    - HooksDispatcherOnMount（初次渲染）
    - HooksDispatcherOnUpdate（更新）
    - InvalidNestedHooksDispatcher（非函数组件上下文，抛错）

#### 5.3 核心 Hooks 实现

- **useState**
  - mountState：创建 Hook 节点，初始化 queue
  - updateState：遍历 queue 计算新 state（baseState + 跳过的更新 + 当前更新）
  - dispatchSetState：创建 update 对象，加入 queue，调度更新

- **useEffect**
  - mountEffect：创建 Effect 对象（create、destroy、deps），挂到 fiber.updateQueue
  - updateEffect：对比 deps，deps 变化则标记 fiber 的 Passive flag
  - commit 阶段异步执行（flushPassiveEffects）：
    - 先执行所有 destroy 清理函数
    - 再执行所有 create 副作用函数，缓存返回的 destroy

- **useRef**：mountRef 创建 { current: initialValue }，updateRef 直接返回

- **useMemo / useCallback**：对比 deps，变化则重新计算，否则返回缓存值

#### 5.4 FunctionComponent beginWork 增强

- renderWithHooks：
  - 切换 Dispatcher
  - 调用函数组件 `Component(props)`
  - 返回 children 用于 reconcileChildren

**阶段目标验收**：能够使用 `useState` 管理状态并触发重渲染，`useEffect` 在 commit 后异步执行。

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
- 事件池复用（React 17 后已移除池化，但本项目可对照早期实现学习）

#### 6.4 批量更新（事件回调中的 setState 自动批处理）

- executionContext 栈标记当前是否在事件处理上下文
- 事件回调中的更新不立即 flush，收集到批次结束后统一 commit

**阶段目标验收**：能够监听 onClick、onChange 等事件，事件回调中多次 setState 只触发一次重渲染。

---

### Phase 7: Context API

#### 7.1 createContext / Provider / Consumer

- createContext(defaultValue) → { Provider, Consumer, _currentValue }
- Provider 组件：beginWork 时将 value 压入栈（pushProvider）
- 消费：函数组件中 useContext(Context)，class 组件中 contextType / Consumer

#### 7.2 context 变化时的传播

- Provider 的 value 变化时，标记子树中所有消费该 context 的 Fiber 需要更新
- bailout 优化：props 不变且无 context 消费时跳过子树渲染

**阶段目标验收**：Provider 更新 value 后，消费该 context 的子组件自动重渲染。

---

### Phase 8: Class 组件生命周期

#### 8.1 ClassComponent beginWork

- 实例化组件：new Component(props, context)
- 挂载阶段：调用 constructor → getDerivedStateFromProps → render → componentDidMount
- 更新阶段：shouldComponentUpdate → render → getSnapshotBeforeUpdate → componentDidUpdate

#### 8.2 setState 实现

- 创建 Update 对象加入 fiber.updateQueue
- 调用 scheduleUpdateOnFiber 触发调度

**阶段目标验收**：能够使用 class 组件，生命周期按正确顺序执行。

---

### Phase 9: 其他核心 API

- **Suspense**：捕获 Promise throw，显示 fallback，Promise resolve 后重新渲染
- **forwardRef**：转发 ref 到子组件
- **memo**：浅比较 props，props 不变时跳过重渲染
- **lazy**：动态 import 组件，配合 Suspense 实现代码分割
- **Portal**：将子树渲染到其他 DOM 节点（createPortal）

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

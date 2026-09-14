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

### Phase 2（简版）: react-dom 包 + 真实 DOM 渲染

> 说明：走的是「同步渲染」路径（单 lane），react-dom 为简版（不含 hydrate / legacy render / 事件系统，见下文待实现区）。

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

- [x] **HostConfig 接口**（`ReactFiberConfig.ts`）
  - 平台无关接口，**构建时 fork 注入**（对齐官方 `ReactFiberConfig.js` / forks/ReactFiberConfig.custom.js）
  - 占位模块模块加载时即 throw，react-dom-bindings 构建时把它替换成 `ReactDOMHostConfig`（reconciler 自身仍以 shim 打包）

- [x] **react-dom 简版**（`packages/react-dom`）
  - `createRoot(container).render(element)`：ReactDOMClient（转出层）→ ReactDOMRoot（createRoot 实现），底层走 reconciler 的 createContainer/updateContainer
  - DOM HostConfig（`packages/react-dom-bindings/src/client/ReactDOMHostConfig.ts`，对齐官方独立的 react-dom-bindings 包）：createInstance/createTextInstance、className/style/普通属性子集、prepareUpdate/commitUpdate、appendChild/insertBefore/removeChild 等
  - npm 分发文件夹 + rollup 构建产物（cjs dev/prod），bundles.js 注册 react-dom bundle，build.js fork 注入 HostConfig
  - 简版边界：不含 hydrate / legacy render / 事件系统 / shouldSetTextContent 优化 / DOMPropertyOperations 完整体系，留待后续 Phase

- [x] **Fragment**（beginWork / completeWork / ChildFiber / ReactFiber 均已处理 `REACT_FRAGMENT_TYPE`）

### Phase 3: 更新与 Diff 算法

- [x] **Diff 算法**（`ReactChildFiber.ts`）
  - 单节点 diff（reconcileSingleElement）、单文本 diff（reconcileSingleTextNode）
  - 多节点 diff（reconcileChildrenArray：头部逐位匹配 → 剩余全新建/全删除 → mapRemainingChildren Map 查找）
  - placeChild lastPlacedIndex 移动标记、key 匹配
  - mountChildFibers（不标记副作用）vs reconcileChildFibers（标记副作用）工厂

- [x] **Fiber 树反射**（`ReactFiberTreeReflection.ts` + `react-reconciler/reflection` 入口）
  - getNearestMountedFiber（沿 return 指针找最近的已挂载 Fiber）
  - findCurrentHostFiber（深度优先找第一个真实 DOM 节点对应的 Fiber）
  - reflection 入口独立于主入口打包，供渲染器按需引入定位真实 DOM 节点（对照官方 reflection.js）

**当前能做什么**：可以创建 ReactElement 对象，有一套完整的 reconciler 主链路——`createContainer/updateContainer` → `workLoop` → `commit mutation`，能对 Fiber 树做挂载、单/多节点 diff、更新、删除；并通过 react-dom 简版的 `createRoot().render()` 把结果渲染到真实 DOM（HostConfig 由构建时 fork 注入）。`fixtures/` 用 react-dom 驱动 reconciler 调试，`pnpm dev` 可看到挂载与二次更新的 DOM 变化。

### Phase 4: 调度器（Scheduler）+ 时间切片 + 完整 Lane 模型

> 说明：引入可中断渲染，长渲染不再一次性占死主线程。scheduler 包按官方完整结构还原，reconciler 接入后普通 `createRoot().render()` 走 DefaultLane 并发路径（异步提交），`flushSync` 走 SyncLane 同步路径。

- [x] **scheduler 包**（`packages/scheduler`，对照官方完整结构）
  - `Scheduler.ts`：`unstable_scheduleCallback`/`unstable_cancelCallback`/`unstable_shouldYield`/`unstable_now` 等导出，taskQueue/timerQueue 双最小堆，expirationTime + timeout 表
  - `SchedulerMinHeap.ts`（按 sortIndex 排序）、`SchedulerPriorities.ts`（5 档优先级）、`SchedulerFeatureFlags.ts`
  - `SchedulerHostConfig.ts` 占位 + `forks/SchedulerHostConfig.default.ts`（MessageChannel 宏任务 + setTimeout fallback、`shouldYieldToHost` 5ms 时间片），构建时 fork 注入（rollup build.js / vite resolveId）

- [x] **完整 Lane 模型**（`ReactFiberLane.ts` + `ReactFiberRoot.ts`）
  - 30 条 lane 位表逐位对齐官方（SyncLane 修正为 bit1、SyncHydrationLane=bit0，InputContinuous/Default/Transition×16/Retry×5/Idle/Offscreen…）
  - getHighestPriorityLane/getNextLanes/markRootUpdated/markRootFinished/markStarvedLanesAsExpired/computeExpirationTime 等优先级与过期/饥饿计算
  - FiberRootNode 补 eventTimes/expirationTimes/suspendedLanes/pingedLanes/expiredLanes/entangledLanes/entanglements

- [x] **事件优先级**（`ReactEventPriorities.ts` + `react-reconciler/constants` 转出）
  - Discrete/Continuous/Default/Idle 四档事件优先级、lanesToEventPriority、currentUpdatePriority 维护

- [x] **reconciler 接入 Scheduler**（`ReactFiberWorkLoop.ts`）
  - `scheduleUpdateOnFiber` → `markRootUpdated` + `ensureRootIsScheduled`（按 lane 选同步队列微任务 flush 或 `scheduleCallback` 分片）
  - executionContext 补 `BatchedContext`；`flushSync`/`scheduleSyncCallback`/`flushSyncCallbacks` 同步队列
  - `scheduleMicrotask` 走 HostConfig（react-dom 用 queueMicrotask/Promise 兜底）

- [x] **workLoop 可中断化**
  - `workLoopConcurrent`（每处理一个 Fiber 检查 `shouldYield`）、`renderRootConcurrent`、`performConcurrentWorkOnRoot`（含过期/阻塞 lane 走同步防饥饿）
  - `prepareFreshStack` 中断恢复：同一 root+lanes 复用 workInProgressRoot 续跑

- [x] **并发更新下的状态计算**（`ReactFiberClassUpdateQueue.ts`）
  - `processUpdateQueue` 按 renderLanes 跳过低优先级 update、记录 baseState/baseUpdate 重放链、`workInProgress.lanes = newLanes` 写回
  - `markUpdateLaneFromFiberToRoot` 改为返回 FiberRootNode；`markSkippedUpdateLanes` 迁入 workLoop

**阶段目标验收**：`fixtures/scheduler` 演示——原生任务 5ms 分片、5000 项大列表并发渲染不阻塞 rAF 帧、`flushSync` 同步更新抢占 DefaultLane 并发渲染。

## 待实现

> **Phase 2 / Phase 3 / Phase 4 已完成**：`react-dom` 包（`createRoot(container).render(<App />)` 渲染到真实 DOM，简版）、reconciler 主链路 + 更新与 Diff 算法、以及 Scheduler + 完整 Lane 模型 + 可中断 workLoop 均已落地，详见上文「已完成」区，故待实现项从 **Phase 5** 开始。后续 Phase 补齐 hydrate、legacy render、事件系统与 DOMPropertyOperations 完整体系。

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

- [x] **useState**：mountState / updateState / dispatchSetState（创建 update、加入 queue、调度更新）
- [x] **useReducer**：mountReducer / updateReducer（useState 是其特例实现，共用同一套更新队列逻辑）
- [x] **useRef**：mountRef 创建 { current: initialValue }，updateRef 原样返回、不比较 deps
- [x] **useMemo / useCallback**：mountMemo/updateMemo、mountCallback/updateCallback，areHookInputsEqual 对比 deps，变化则重算/返回新引用，否则复用缓存
- [x] **useEffect**：mountEffect/updateEffect（`ReactFiberHooks.ts` 里的 `mountEffectImpl`/`updateEffectImpl`，deps 复用 areHookInputsEqual，标记 Passive fiber flag），effect 节点用 pushEffect 串成循环链表挂在 `fiber.updateQueue`（与 ClassComponent updateQueue 结构不同，只是复用字段名）
  - commit 阶段异步执行：`commitRootImpl` 检测到 Passive flag 后 `scheduleCallback(NormalPriority, flushPassiveEffects)`，先 `commitPassiveUnmountEffects` 再 `commitPassiveMountEffects`
  - 简化范围：`PassiveMask` 简化为只含 `Passive` 位（官方还含 Visibility/ChildDeletion），未做 StrictMode 双调用
- [x] **useLayoutEffect**：mountLayoutEffect/updateLayoutEffect（标记 Update fiber flag，复用同一套 pushEffect/deps 比较），`commitRootImpl` 在 `commitMutationEffects` 之后、`root.current` 切换之后同步跑 `commitLayoutEffects`
  - 旧 layout effect 的销毁提前到 mutation 阶段（`commitMutationEffectsOnFiber` 的 FunctionComponent 分支），保证一棵树里所有兄弟组件的销毁都先跑完才轮到挂载
  - 组件整体卸载时（`commitDeletionEffectsOnFiber` 的 FunctionComponent 分支）统一清理 layout + passive effect 的 destroy
- [x] **useTransition**：mountTransition/updateTransition + startTransition（`ReactFiberHooks.ts`）。start 函数内部：先把 `currentUpdatePriority` 提升到 `ContinuousEventPriority` 并 `setPending(true)`（走一次紧急更新让"进入 pending"立刻反映到 UI），再把 `ReactCurrentBatchConfig.transition` 置为非 null，`setPending(false)` 与 callback() 内部的更新在这个标记内一起派发；`requestUpdateLane` 检测到 `transition` 非空就走 `claimNextTransitionLane`（同一事件内的多次更新复用 `currentEventTransitionLane`，直到 `performConcurrentWorkOnRoot` 重置）
  - 新增 `packages/react/src/ReactCurrentBatchConfig.ts`（`{ transition }` 字段），聚合进 `ReactSharedInternals`
  - 简化范围：不支持异步 action（callback 返回 Promise 时官方会 entangle async action scope、延后 isPending 变回 false），本项目 startTransition 只接受同步回调；`Transition` 对象简化为空对象占位，不含官方的 `_updatedFibers`/`types` 等 DEV 调试字段
- [x] **useDeferredValue**：mountDeferredValue/updateDeferredValue（`ReactFiberHooks.ts`），值变化且当前渲染含紧急 lane（`!includesOnlyNonUrgentLanes(renderLanes)`）时保留旧值、派生一条 deferred lane 稍后单独渲染；否则直接用新值
  - `requestDeferredLane` 简化为直接复用 `claimNextTransitionLane`（官方有独立的 `DeferredLane` 位，本项目 lane 位表未单独开一位，效果上仍能让 deferred 渲染独立成一条 lane）
  - 简化范围：不支持 `initialValue` 第二参数（配合 Suspense 预渲染场景，本项目暂无 Suspense）
- [x] **useSyncExternalStore**：mountSyncExternalStore/updateSyncExternalStore（`ReactFiberHooks.ts`）。渲染时直接读一次 `getSnapshot()` 作为本次值（打破"只依赖参数/上次状态"的常规，只因 store 更新语义恒为同步）；`mountEffect` 挂一条订阅 effect（`subscribeToStore`，commit 后才真正调用外部 `subscribe`），另 `pushEffect` 一条不比较 deps 的 passive effect（`updateStoreInstance`），每次 commit 后同步 `inst` 缓存并补一次快照检查
  - `subscribeToStore`/`updateStoreInstance` 检测到快照变化（`checkIfSnapshotChanged`）都调用 `forceStoreRerender`：新增 `enqueueConcurrentRenderForLane`（`ReactFiberConcurrentUpdates.ts`，只冒泡 lane、不携带 update 对象）+ `scheduleUpdateOnFiber`，强制走 `SyncLane` 同步重渲染
  - 简化范围：不支持 `getServerSnapshot`（SSR/hydrate 明确不做，见 Phase 10）；不做官方 render 阶段被并发事件打断时的 `pushStoreConsistencyCheck` 一致性检查（依赖 commit 前整树扫描 `StoreConsistency` flag + 事件系统，Phase 6 才落地），只保留 `subscribeToStore` + `updateStoreInstance` 这条被动检测路径——足够覆盖"外部 store 变化触发重渲染"这个可验证的主路径
- **useId**：基于组件树挂载路径生成跨 SSR/CSR 一致的唯一 id，依赖 Phase 4 未涉及的 treeContext（forkStack/idStack），Phase 9 做 hydrate 时一并补齐

#### 5.3.1 ReactFiberConcurrentUpdates（并发更新入队）

- `packages/react-reconciler/src/ReactFiberConcurrentUpdates.ts`（官方同名文件，Phase 4 接入 Scheduler 时暂未还原，Hooks 落地时一起补）
  - `enqueueConcurrentHookUpdate` / `enqueueConcurrentClassUpdate`：并发渲染期间的 update 先记录到一个全局队列，而非直接挂到 fiber 上，避免渲染中的 fiber 树被并发事件污染
  - `finishQueueingConcurrentUpdates`：commit 前统一把暂存的 update 刷回各自 fiber 的 updateQueue，并同时把 lane 冒泡到 root（对应本项目当前 `markUpdateLaneFromFiberToRoot` 的即时冒泡，Hooks 阶段需要切到这套延迟入队模型）

#### 5.4 调试方式（第三种）

- hooks 调试：在 Dispatcher 切换 / Hook 链表构建处断点，观察 hook 状态变化

#### 5.5 noop-renderer（测试渲染器）

- 新建 `react-noop-renderer` 包（官方 packages/react-noop-renderer 对应用来测 reconciler 的宿主）
  - 实现一套不操作真实 DOM 的 HostConfig（内存树），配合 useEffect 等副作用做确定性测试

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

#### 7.0 ReactFiberStack（通用栈基础设施）

- `packages/react-reconciler/src/ReactFiberStack.ts`（官方同名文件，Context/legacy context/host context 共用这一套通用栈）
  - `createCursor` / `push` / `pop`：以 `renderLanes` 无关的方式在 render 阶段栈式保存/恢复某个值，`pop` 时机由子树是否遍历完毕决定（对应 completeWork 归的时机）
  - Context 的 `pushProvider`/`popProvider`（7.1）就是这套栈的具体应用之一，不是 Context 专属机制

#### 7.1 createContext / Provider / Consumer / useContext

- createContext(defaultValue) → { Provider, Consumer, _currentValue }
- Provider 组件：beginWork 时将 value 压入栈（pushProvider，基于 7.0 的通用栈）
- 消费：函数组件 useContext(Context)，class 组件 contextType / Consumer

#### 7.2 context 变化时的传播与 bailout 兼容

- Provider 的 value 变化时，标记子树中所有消费该 context 的 Fiber 需要更新
- context 与 bailout 策略联动：无 context 消费时跳过子树渲染（基础 bailout 已实现，需补 dependencies 记录 context 依赖）

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

#### 9.0 ReactFiberThrow / ReactFiberUnwindWork（unwind 地基）

- `packages/react-reconciler/src/ReactFiberThrow.ts`（官方 ReactFiberThrow.old.js）
  - `throwException`：render 阶段捕获到 throw（Promise 或普通 Error）后，沿 `return` 链向上找最近的 Suspense/错误边界 Fiber，标记 `ShouldCapture`
- `packages/react-reconciler/src/ReactFiberUnwindWork.ts`（官方 ReactFiberUnwindWork.old.js）
  - `unwindWork`：completeUnitOfWork 的 Incomplete 分支调用，沿路径向上清理未完成的栈（context/host context 等 `pop`），找到 `ShouldCapture` 的边界后转 `DidCapture`，从该节点重新进入 beginWork 渲染 fallback/错误 UI
  - 这套机制是 Suspense（9.1）与错误边界（9.3）共用的同一地基，不是各自独立实现

#### 9.1 Suspense 完整实现

- 捕获 Promise throw，显示 fallback，Promise resolve 后重新渲染（依赖 9.0 的 unwind 地基）
- **OffscreenComponent**：`packages/react-reconciler/src/ReactFiberOffscreenComponent.ts`（官方 ReactFiberOffscreenComponent.old.js）—— Suspense 用它包裹主内容并隐藏，保留 Fiber 状态不销毁，等 Promise resolve 后可以直接恢复而不是重新挂载；需补 ReactWorkTags 的 OffscreenComponent tag
- **use（试验性 hook）**：Suspense 的触发入口
- 补 ReactSymbols 的 REACT_SUSPENSE_TYPE、ReactWorkTags 的 SuspenseComponent 等

#### 9.2 forwardRef / memo / lazy / Portal

- **forwardRef**：转发 ref 到子组件（需补 markRef、coerceRef 字符串 ref 自动转换、Ref flag 的 commit 处理）
- **memo**：浅比较 props，props 不变时跳过重渲染（需补 MemoComponent/SimpleMemoComponent tag 与 REACT_MEMO_TYPE）
- **lazy**：动态 import 组件，配合 Suspense 实现代码分割（需补 REACT_LAZY_TYPE）
- **Portal**：createPortal 将子树渲染到其他 DOM 节点（需补 HostPortal 的 commit 空壳分支）

#### 9.3 错误边界与异常处理

- **ErrorBoundary**：class 组件实现 getDerivedStateFromError / componentDidCatch
- **捕获与回退**：render / lifecycle / commit 抛错 → throwException（9.0）沿 return 链向上找最近的错误边界 Fiber → 标记 DidCapture → unwindWork（9.0）渲染 fallback
- **retry**：错误边界捕获后重新渲染（重置 DidCapture → 重走 render 阶段）

#### 9.4 性能优化策略

- **eagerState**：dispatchSetState 时若 state 不变则提前 bailout，跳过整次调度（基础 bailout 已实现，eagerState 是 dispatch 侧优化）
- **React.memo / useMemo / useCallback**：与 bailout 联动的 props 浅比较（见 9.2 / Phase 5.3）

---

### Phase 10: Hydrate / Legacy render（当前明确不做，仅记录范围）

> Lane 表里已经铺了 `SyncHydrationLane`/`InputContinuousHydrationLane`/`DefaultHydrationLane`/`SelectiveHydrationLane`/`IdleHydrationLane` 五条 hydration lane（对齐官方位表），但本项目 react-dom 简版目前只有 `createRoot`，没有 `hydrateRoot`/`ReactDOM.render`（legacy）。列出来是为了明确这是有意搁置，而不是遗漏：

- **hydrateRoot**：SSR 场景下复用已有 DOM 而非新建，需要 `getIsHydrating`/`tryToClaimNextHydratableInstance` 等一整套匹配已有 DOM 节点的逻辑（`ReactFiberHydrationContext.ts`）
- **legacy render（ReactDOM.render）**：LegacyRoot 模式，更新恒为 SyncLane，行为上更接近 React 17（无并发特性），本项目 ReactRootTags 已有 LegacyRoot 占位但未接入
- **selective hydration**：并发模式下 hydration 与交互事件的优先级协调（用户点击未 hydrate 完的区域时优先 hydrate 该部分）

---

## 参考资料

- 官方仓库：https://github.com/facebook/react
- 对照文件路径：
  - react 核心：`packages/react/src/`
  - react-dom：`packages/react-dom/src/`
  - react-dom-bindings：`packages/react-dom-bindings/src/`
  - reconciler：`packages/react-reconciler/src/`
  - scheduler：`packages/scheduler/src/`

---

## 开发原则

1. **1:1 对照官方源码**：保持文件路径、函数命名、算法逻辑与官方一致
2. **渐进式实现**：先跑通主链路，再补边界 case 和优化
3. **注释说明意图**：只在关键算法处注释"为什么官方这么做"，不写样板注释
4. **验收标准清晰**：每个 Phase 结束都有可执行的示例代码验证功能正确性

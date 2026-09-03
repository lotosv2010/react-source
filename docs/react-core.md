# React 核心主线

本文档按「框架设计思想 → 核心数据结构 → 核心流程（含子流程） → 其他高频知识点 → 参考资料」梳理 React 18 的实现原理，只讲 React 本身，不涉及本项目的实现进度，每个知识点配一张简化流程图，方便记忆和面试复述。

## 一、框架设计思想

### 1.1 分层架构：四层解耦

```
┌─────────────────────────────────────────┐
│ React 核心 API (packages/react)           │  只描述"渲染什么"
│ createElement / jsx / Component / hooks入口│
└─────────────────────────────────────────┘
              │ ReactElement
              ▼
┌─────────────────────────────────────────┐
│ Reconciler (packages/react-reconciler)    │  平台无关，Fiber树构建+diff+调度接入
│ beginWork / completeWork / commit         │
└─────────────────────────────────────────┘
              │ HostConfig（createInstance/appendChild...）
              ▼
┌─────────────────────────────────────────┐
│ 渲染器 (react-dom / react-native...)      │  把变更落地到具体平台
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Scheduler (packages/scheduler)            │  通用调度库，不感知Fiber
│ 决定"什么时候做"，reconciler决定"做什么"    │
└─────────────────────────────────────────┘
```

**为什么这样分层**：reconciler 与渲染器之间用 HostConfig 解耦 → 一套 diff 算法可以对接 DOM/Native/自定义渲染器；reconciler 与 scheduler 解耦 → 调度能力可以独立演进（甚至被其他项目复用），reconciler 只需要"lane → 优先级"的桥接。

### 1.2 虚拟 DOM 的本质

```
JSX ──createElement──▶ ReactElement树（虚拟DOM）
                              │ 不是为了"比原生快"
                              │ 而是：①跨平台抽象 ②把命令式DOM操作
                              │        变成可批量/可中断的声明式描述
                              ▼
                        Fiber树（可中断的工作单元）
                              │ diff 得到"最小变更集合"
                              ▼
                        真实 DOM（一次性 commit）
```

### 1.3 render 阶段 vs commit 阶段

|          | render 阶段                              | commit 阶段                                      |
| -------- | ---------------------------------------- | ------------------------------------------------ |
| 做什么   | 构建 workInProgress Fiber 树，标记副作用 | 把副作用应用到真实 DOM                           |
| 能否中断 | 能（并发模式下可被打断，之后恢复或重来） | 不能（必须同步跑完，否则用户看到中间状态）       |
| 核心函数 | beginWork（递）/ completeWork（归）      | commitBeforeMutation/commitMutation/commitLayout |

```
render 阶段（可中断）              commit 阶段（不可中断）
┌────────────┐                  ┌───────────────────────┐
│ beginWork↓ │──完成子树后──▶   │ before mutation        │
│ completeWork↑│               │ mutation（真正操作DOM） │
└────────────┘                  │ layout（DOM变更后）     │
                                 └───────────────────────┘
```

## 二、核心数据结构

### 2.1 ReactElement —— UI 的静态描述

```ts
{
  $$typeof: (REACT_ELEMENT_TYPE, type, key, ref, props);
}
```

由 `createElement`/`jsx` 产出的不可变普通对象（DEV 下 `Object.freeze`），只是"描述"不含实例状态，每次 render 都重新创建。

### 2.2 Fiber —— 可中断工作单元 + 实例状态载体

```
FiberNode {
  tag, type, key, ref, props,     // 对应 ReactElement
  stateNode,                       // 真实实例：DOM节点/class实例/FiberRoot
  return, child, sibling,          // 树形指针（非数组，才能中断后精确恢复）
  alternate,                       // 指向双缓存树中对应的另一棵树的节点
  flags, subtreeFlags,             // 副作用标记：Placement/Update/Deletion...
  memoizedState,                   // 函数组件=Hook链表，class组件=this.state
  updateQueue,                     // 待处理更新队列
  lanes, childLanes,                // 本节点/子树的优先级
}
```

```
        FiberRoot
            │ current
            ▼
         HostRoot Fiber
            │ child
            ▼
      ┌───────────┐   sibling   ┌───────────┐
      │  Fiber A  │────────────▶│  Fiber B  │
      └───────────┘             └───────────┘
            │ child                    return↑
            ▼
      ┌───────────┐
      │  Fiber A1 │
      └───────────┘
```

**为什么用链表而非递归**：Stack Reconciler 递归遍历树一旦开始无法中断（JS 调用栈无法从中间恢复）。Fiber 用 child/sibling/return 链表模拟调用栈，把"处理进度"存在节点上，可以随时中断、把控制权交还浏览器，之后再从中断点继续——这是"时间切片"的前提。

### 2.3 双缓存树（current / workInProgress）

```
     current 树（屏幕上显示的）        workInProgress 树（正在构建的）
     ┌─────────┐  alternate  ┌─────────┐
     │ Fiber   │◀───────────▶│ Fiber   │
     └─────────┘             └─────────┘
          ▲                       │
          │      构建完成后         │
          └──────整体切根───────────┘
          FiberRoot.current = workInProgress
```

两棵树通过 `alternate` 指针互相引用，构建完成后直接切换根指针，而不是逐节点替换 DOM——即使渲染中途出错也不会影响已显示的内容。

### 2.4 Lane —— 优先级模型

```
lanes: 31位二进制位
bit0  bit1        bit5      bit6~21        bit22~26  bit27~30
Sync  SyncHydration InputCont Default×N   Transition×16  Retry×5  Idle  Offscreen
（数值越小优先级越高，可用位运算合并/比较多个更新的优先级）
```

一个 update 被分配到某个 lane，多个 update 可以合并处理（`mergeLanes`）；高优先级 lane 到来时可以打断正在进行的低优先级渲染。

### 2.5 UpdateQueue —— 更新队列

```
fiber.updateQueue.shared.pending
        │
        ▼
   Update ──next──▶ Update ──next──▶ Update ──┐
        ▲                                      │
        └──────────────循环链表────────────────┘
```

`enqueueUpdate` 把新 update 接入循环链表，`processUpdateQueue` 在 render 阶段按 lane 优先级依次消费、算出 `memoizedState`，跳过的低优先级 update 保留在 baseUpdate 链上等下次重新计算。

## 三、核心流程

### 3.1 主链路总览

```
createElement()             生成 ReactElement
      │
scheduleUpdateOnFiber()     标记更新，冒泡lane到root
      │
ensureRootIsScheduled()     按lane选：同步微任务 or scheduler.scheduleCallback
      │
┌─────▼─────────────────────────────┐
│ render阶段（可中断）                 │
│  prepareFreshStack                 │
│  workLoopSync / workLoopConcurrent │
│    performUnitOfWork               │
│      beginWork（递）                │
│      completeUnitOfWork（归）       │
└─────┬─────────────────────────────┘
      │ 产出：带flags标记的Fiber树
commitRoot()
      │
┌─────▼─────────────┐
│ commit阶段（不可中断）│
│  before mutation    │
│  mutation            │
│  layout              │
└────────────────────┘
      │
真实 DOM 更新完成
```

### 3.2 子流程：beginWork（递）

```
beginWork(current, workInProgress)
      │
   didReceiveUpdate?  ── 否 ──▶ bailoutOnAlreadyFinishedWork（跳过，克隆子Fiber直接返回）
      │ 是
      ▼
  按 tag 分发：
  HostRoot      → reconcileChildren(根据ReactElement)
  HostComponent → 处理children，reconcileChildren
  FunctionComponent → renderWithHooks执行函数得到children
  Fragment      → 直接处理children
      │
      ▼
  reconcileChildren（diff算法，见3.5）标记 Placement/Update/ChildDeletion
      │
      ▼
  返回第一个子Fiber（workLoop继续往下走）
```

### 3.3 子流程：completeWork（归）

```
completeWork(current, workInProgress)
      │
  按 tag 分发：
  HostComponent → 首次挂载：createInstance + appendAllChildren（构建离屏DOM子树）
                → 更新：prepareUpdate生成updatePayload，标记Update flag
  HostText      → 首次挂载：createTextInstance
                → 更新：updateHostText
      │
      ▼
  bubbleProperties：把子树的 flags/lanes 向上冒泡汇总到 subtreeFlags
      │
      ▼
  有 sibling？──有──▶ 转去处理 sibling（继续 beginWork）
      │ 无
      ▼
  返回 return（父节点），父节点继续 completeWork
```

### 3.4 子流程：commit 三个子阶段

```
commitRoot(root)
      │
① commitBeforeMutationEffects
      （getSnapshotBeforeUpdate）
      │
② commitMutationEffects          ← 核心：真正操作DOM
      │  按 flags 分发：
      │  Placement     → insertOrAppendPlacementNode（找宿主锚点插入）
      │  Update        → commitUpdate / commitTextUpdate
      │  ChildDeletion → 递归卸载子树，触发effect清理
      │
③ commitLayoutEffects
      （componentDidMount/DidUpdate、ref赋值）
      │
      ▼
  root.current = finishedWork（切根，双缓存完成整体替换）
```

### 3.5 子流程：Diff 算法（reconcileChildren）

```
reconcileChildren(current, workInProgress, nextChildren)
      │
  新children是单个ReactElement？
      │ 是 ──▶ reconcileSingleElement
      │        key相同且type相同 → 复用；否则删旧建新（整棵子树重建）
      │ 否（数组）
      ▼
  reconcileChildrenArray（多节点diff，两轮遍历）
      │
  第一轮：顺序遍历新旧children，key+type都相同则复用并原地更新
      │   一旦遇到key不同 → 跳出第一轮
      ▼
  第二轮：
    - 新children还有剩余，旧children已空 → 全部新建（mount）
    - 旧children还有剩余，新children已空 → 全部标记删除
    - 都有剩余 → 用Map(key→oldFiber)查找可复用节点，
                 用 lastPlacedIndex 判断是否需要移动（Placement）
```

**为什么不建议用 index 当 key**：增删/排序场景下 index 会随位置变化，导致本该复用的节点被错误标记为需要更新/删错节点。

### 3.6 子流程：调度接入（Scheduler + Lane 桥接）

```
scheduleUpdateOnFiber(fiber, lane)
      │
markRootUpdated(root, lane)      root.pendingLanes |= lane
      │
ensureRootIsScheduled(root)
      │
getNextLanes(root)                取当前最高优先级的lane集合
      │
  是SyncLane？
      │ 是 ──▶ scheduleSyncCallback → 微任务flushSyncCallbacks → renderRootSync（不可中断）
      │ 否
      ▼
  lanesToEventPriority(lanes) 映射到 Scheduler 优先级
      │
  scheduler.unstable_scheduleCallback(priority, performConcurrentWorkOnRoot)
      │
performConcurrentWorkOnRoot
      │
  renderRootConcurrent → workLoopConcurrent
      │   每处理一个Fiber就检查 shouldYield()
      │   true → 中断，把控制权交还浏览器，之后重新调度续跑
      │   false → 继续 performUnitOfWork
      ▼
  render完成 → commitRoot（同步不可中断）
```

**中断后如何恢复**：不是恢复 JS 调用栈，而是保留 workInProgressRoot 上已完成的部分，重新调度后从 root 重新走一遍 `beginWork`（已完成且无更新的节点走 bailout 跳过，不重复计算）。

## 四、其他高频知识点

### 4.1 Hooks 原理

```
FunctionComponent渲染
      │
renderWithHooks
      │
  mount？──是──▶ ReactCurrentDispatcher.current = HooksDispatcherOnMount
      │ 否（update）
      ▼        ReactCurrentDispatcher.current = HooksDispatcherOnUpdate
      │
  执行函数组件，函数体内每次调用 useXxx()
      │           实际转发给 dispatcher.useXxx
      ▼
  按调用顺序在 fiber.memoizedState 上挂/取 Hook链表节点：
  Hook{ memoizedState, queue, next } → Hook{...} → Hook{...}
```

- 是"链表"：调用顺序必须稳定，因为 React 靠"第几次调用"而非变量名对应链表节点——这是不能在条件/循环中调用 Hooks 的根本原因
- `useEffect`（Passive，commit后异步执行，不阻塞绘制） vs `useLayoutEffect`（Layout，commit的layout子阶段同步执行，可读最新布局但会阻塞）
- `useMemo`/`useCallback` 用 `Object.is` 浅比较 deps，本质是"用空间换时间"
- 闭包陷阱：每次渲染都是全新函数调用和全新变量作用域，`useEffect` 里拿到的是创建那次渲染的 state 快照

### 4.2 批处理与并发特性（React 18 新增）

```
事件回调 / setTimeout / Promise 中多次 setState
      │
  React18: 统一走 batchedUpdates（不区分是否合成事件回调）
      │
  多个update都enqueue，但只ensureRootIsScheduled一次
      │
  本次批次结束 → 统一走一次render+commit（只重渲染一次）
```

- `useTransition`/`useDeferredValue`：本质是给这次更新分配一个更低优先级的 TransitionLane，不是"延迟执行"而是"允许被高优先级更新打断"
- `Suspense`：渲染中抛出 Promise → 被最近的 Suspense 边界捕获 → 显示 fallback → Promise resolve 后重新渲染该子树（unwind流程）

### 4.3 组件与生命周期

```
class组件更新流程与Fiber阶段对应：
  shouldComponentUpdate      → beginWork（可用于bailout跳过）
  getDerivedStateFromProps   → beginWork
  render                     → beginWork
  getSnapshotBeforeUpdate    → commit before mutation
  componentDidMount/Update   → commit layout
```

- `PureComponent`/`React.memo`：浅比较 props/state，等价于自动生成的 `shouldComponentUpdate`
- Error Boundary：`getDerivedStateFromError`/`componentDidCatch` 在 commit 阶段捕获渲染错误，**无法**捕获事件处理函数里的错误（那是普通 try/catch 的范畴）

### 4.4 Context 跨层通信

```
Provider(value) beginWork时 pushProvider(context, value) 压栈
      │
子树消费方 useContext(context) / class.contextType
      │  读取 context._currentValue
      │  同时把当前fiber记录到 context的订阅链表（dependencies）
      │
Provider的value变化
      │
propagateContextChange：遍历订阅链表，标记订阅者的lane
      │  未订阅该context的子树 → bailout跳过，不重新渲染
      ▼
只有订阅了该context的Fiber才会重新render
```

### 4.5 事件系统

```
createRoot(container)
      │
  在container上注册合成事件监听（一次性，委托）listenToAllSupportedEvents
      │
原生事件触发（例如click冒泡到container）
      │
dispatchEvent
      │
  从event.target向上收集Fiber路径（getEventTarget → 沿return找HostComponent）
      │
  按路径模拟捕获（从根到target）→ 冒泡（从target到根）
      │  依次调用收集到的onClick/onClickCapture等props回调
      ▼
  回调内的setState → 走批处理（4.2），不会立即触发多次渲染
```

- 合成事件（SyntheticEvent）包装原生 event，抹平浏览器差异，同时和 Fiber 的优先级/批处理机制打通
- 事件委托：所有事件统一绑定在 root 容器上，而非每个 DOM 节点单独绑定，节省内存

## 五、参考资料

- React 官方仓库：https://github.com/facebook/react
- Fiber 架构设计文档（React 团队）：https://github.com/acdlite/react-fiber-architecture
- Big-React（卡颂）：https://github.com/BetaSu/big-react
- React技术揭秘（卡颂）：https://react.iamkasong.com/

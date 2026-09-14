/**
 * @file commit 阶段（mutation 子阶段）
 * @description 将 render 阶段构建好的 Fiber 树变更应用到真实 DOM：插入/更新/删除
 */

import type { FiberNode } from "./ReactFiber";
import {
  Callback,
  LayoutMask,
  MutationMask,
  PassiveMask,
  Placement,
  Snapshot,
  Update,
} from "./ReactFiberFlags";
import {
  appendChild,
  appendChildToContainer,
  commitTextUpdate,
  commitUpdate,
  insertBefore,
  insertInContainerBefore,
  removeChild,
  removeChildFromContainer,
  supportsMutation,
} from "./ReactFiberConfig";
import type { Lanes } from "./ReactFiberLane";
import type { FiberRootNode } from "./ReactFiberRoot";
import type { Effect, FunctionComponentUpdateQueue } from "./ReactFiberHooks";
import type { Update as ClassUpdate } from "./ReactFiberClassUpdateQueue";
import {
  HasEffect as HookHasEffect,
  Layout as HookLayout,
  Passive as HookPassive,
  type HookFlags,
} from "./ReactHookEffectTags";
import {
  ClassComponent,
  FunctionComponent,
  HostComponent,
  HostPortal,
  HostRoot,
  HostText,
} from "./ReactWorkTags";

// 删除操作需要在向上回溯过程中临时记住"最近的 host 父节点"，官方用模块级变量在
// commitDeletionEffectsOnFiber 递归间传递。
let hostParent: any = null;
let hostParentIsContainer = false;

// 对照官方 commitHookEffectListMount：遍历 fiber.updateQueue（Hook effect 的循环链表），
// 只执行 tag 与 flags 按位匹配的 effect（HookHasEffect 标记 deps 是否变化，
// HookLayout/HookPassive 区分 effect 类型）。create 的返回值存回 effect.destroy，
// 供下次卸载/重新执行时调用。
function commitHookEffectListMount(
  flags: HookFlags,
  finishedWork: FiberNode,
): void {
  const updateQueue: FunctionComponentUpdateQueue | null =
    finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect: Effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const create = effect.create;
        effect.destroy = create();
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

// 对照官方 commitHookEffectListUnmount：同样按位匹配遍历，调用缓存的 destroy 并清空，
// 避免重复调用（对应 deps 不变、effect 未重新执行的场景不会被这里影响）。
function commitHookEffectListUnmount(
  flags: HookFlags,
  finishedWork: FiberNode,
): void {
  const updateQueue: FunctionComponentUpdateQueue | null =
    finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect: Effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const destroy = effect.destroy;
        if (destroy !== undefined) {
          effect.destroy = undefined;
          destroy();
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

function isHostParent(fiber: FiberNode): boolean {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    fiber.tag === HostPortal
  );
}

function getHostParentFiber(fiber: FiberNode): FiberNode {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }

  throw new Error(
    "Expected to find a host parent. This error is likely caused by a bug " +
      "in React. Please file an issue.",
  );
}

// 找已提交的、稳定的兄弟 host 节点（作为 insertBefore 的锚点）。只找不带有 Placement 的
// 兄弟节点，带 Placement 的说明它自己也还没插入。
function getHostSibling(fiber: FiberNode): any {
  let node: FiberNode = fiber;
  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
    while (node.tag !== HostComponent && node.tag !== HostText) {
      if (node.flags & Placement) {
        continue siblings;
      }
      if (node.child === null || node.tag === HostPortal) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }
    // 找到一个稳定或即将插入的 host 节点
    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}

// 递归地把 Placement 子树里的所有 host 节点插入到父容器
function insertOrAppendPlacementNodeIntoContainer(
  node: FiberNode,
  before: any,
  parent: any,
): void {
  const tag = node.tag;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const stateNode = node.stateNode;
    if (before) {
      insertInContainerBefore(parent, stateNode, before);
    } else {
      appendChildToContainer(parent, stateNode);
    }
  } else if (tag === HostPortal) {
    // portal 自己负责插入其子树
  } else {
    const child = node.child;
    if (child !== null) {
      insertOrAppendPlacementNodeIntoContainer(child, before, parent);
      let sibling = child.sibling;
      while (sibling !== null) {
        insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

function insertOrAppendPlacementNode(
  node: FiberNode,
  before: any,
  parent: any,
): void {
  const tag = node.tag;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const stateNode = node.stateNode;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      appendChild(parent, stateNode);
    }
  } else if (tag === HostPortal) {
    // portal 自己负责插入其子树
  } else {
    const child = node.child;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      let sibling = child.sibling;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

function commitPlacement(finishedWork: FiberNode): void {
  if (!supportsMutation) {
    return;
  }

  // 向上找到最近的 host 父 fiber，把整棵 Placement 子树插入
  const parentFiber = getHostParentFiber(finishedWork);

  switch (parentFiber.tag) {
    case HostComponent: {
      const parent = parentFiber.stateNode;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    case HostRoot:
    case HostPortal: {
      const parent = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
      break;
    }
    default:
      throw new Error(
        "Invalid host parent fiber. This error is likely caused by a bug " +
          "in React. Please file an issue.",
      );
  }
}

function commitReconciliationEffects(finishedWork: FiberNode): void {
  const flags = finishedWork.flags;
  if (flags & Placement) {
    try {
      commitPlacement(finishedWork);
    } catch (error) {
      // 错误边界捕获留到 Phase 9
      throw error;
    }
    // 清除 Placement 标记，表示节点已插入（isMounted 等依赖这一点）
    finishedWork.flags &= ~Placement;
  }
}

function recursivelyTraverseDeletionEffects(
  _finishedRoot: FiberRootNode,
  _nearestMountedAncestor: FiberNode,
  parent: FiberNode,
): void {
  // 递归删除子节点（Phase 5 时这里会卸载 effect，现在只需移除 host 节点）
  let child = parent.child;
  while (child !== null) {
    commitDeletionEffectsOnFiber(_finishedRoot, _nearestMountedAncestor, child);
    child = child.sibling;
  }
}

function commitDeletionEffectsOnFiber(
  finishedRoot: FiberRootNode,
  nearestMountedAncestor: FiberNode,
  deletedFiber: FiberNode,
): void {
  switch (deletedFiber.tag) {
    case HostComponent: {
      // 官方这里先 safelyDetachRef（清 ref），随后故意 fall through 到 HostText 分支——
      // 宿主的子节点由它自己整体移除，所以递归时把 hostParent 置空，避免子节点重复 remove
    }
    case HostText: {
      // 只需移除最近的宿主子节点：递归期间 hostParent 置空，嵌套的 host 节点不会各自 remove，
      // 因为它们已经随着顶层节点一起被移除了
      if (supportsMutation) {
        const prevHostParent = hostParent;
        const prevHostParentIsContainer = hostParentIsContainer;
        hostParent = null;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;

        if (hostParent !== null) {
          if (hostParentIsContainer) {
            removeChildFromContainer(hostParent, deletedFiber.stateNode);
          } else {
            removeChild(hostParent, deletedFiber.stateNode);
          }
        }
      } else {
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
      }
      return;
    }
    case HostRoot: {
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      return;
    }
    case FunctionComponent: {
      // 整棵组件被卸载：不管 deps 上次是否变化（HookHasEffect 未打也要清理），
      // 所有 layout/passive effect 的 destroy 都必须执行一次，否则会漏清理订阅等资源
      commitHookEffectListUnmount(HookLayout, deletedFiber);
      commitHookEffectListUnmount(HookPassive, deletedFiber);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      return;
    }
    case ClassComponent: {
      // 官方这里先 safelyDetachRef，再 safelyCallComponentWillUnmount（try/catch 包裹，
      // 本项目错误边界未落地，直接调用，异常留给上层渲染调用方处理）
      const instance = deletedFiber.stateNode;
      if (typeof instance.componentWillUnmount === "function") {
        instance.componentWillUnmount();
      }
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      return;
    }
    default: {
      // Fragment/Mode 等没有自己 DOM 的节点：保持 hostParent 不变，继续向下找可移除的 host 节点
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
    }
  }
}

function commitDeletionEffects(
  root: FiberRootNode,
  returnFiber: FiberNode,
  deletedFiber: FiberNode,
): void {
  if (supportsMutation) {
    // 先向上找最近的 host 父节点（在 fiber 树上搜索，而不是走 JS 调用栈）
    let parent = returnFiber;
    findParent: while (parent !== null) {
      switch (parent.tag) {
        case HostComponent: {
          hostParent = parent.stateNode;
          hostParentIsContainer = false;
          break findParent;
        }
        case HostRoot: {
          hostParent = parent.stateNode.containerInfo;
          hostParentIsContainer = true;
          break findParent;
        }
        case HostPortal: {
          hostParent = parent.stateNode.containerInfo;
          hostParentIsContainer = true;
          break findParent;
        }
      }
      parent = parent.return!;
    }
    if (hostParent === null) {
      throw new Error(
        "Expected to find a host parent. This error is likely caused by " +
          "a bug in React. Please file an issue.",
      );
    }
    commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
    hostParent = null;
    hostParentIsContainer = false;
  }
}

function recursivelyTraverseBeforeMutationEffects(
  root: FiberRootNode,
  parentFiber: FiberNode,
): void {
  if (parentFiber.subtreeFlags & Snapshot) {
    let child = parentFiber.child;
    while (child !== null) {
      commitBeforeMutationEffectsOnFiber(root, child);
      child = child.sibling;
    }
  }
}

// 对照官方 commitBeforeMutationEffectsOnFiber：mutation 之前的一次遍历，只处理
// getSnapshotBeforeUpdate——它必须在 DOM 变更之前读（比如滚动位置），读到的值挂在实例的
// __reactInternalSnapshotBeforeUpdate 上，供 layout 阶段的 componentDidUpdate 取用。
function commitBeforeMutationEffectsOnFiber(
  root: FiberRootNode,
  finishedWork: FiberNode,
): void {
  const flags = finishedWork.flags;

  switch (finishedWork.tag) {
    case ClassComponent: {
      recursivelyTraverseBeforeMutationEffects(root, finishedWork);
      if (flags & Snapshot) {
        const current = finishedWork.alternate;
        const instance = finishedWork.stateNode;
        if (current !== null) {
          const prevProps = current.memoizedProps;
          const prevState = current.memoizedState;
          instance.__reactInternalSnapshotBeforeUpdate =
            instance.getSnapshotBeforeUpdate(prevProps, prevState);
        }
      }
      return;
    }
    default: {
      recursivelyTraverseBeforeMutationEffects(root, finishedWork);
      return;
    }
  }
}

export function commitBeforeMutationEffects(
  root: FiberRootNode,
  finishedWork: FiberNode,
): void {
  commitBeforeMutationEffectsOnFiber(root, finishedWork);
}

function recursivelyTraverseMutationEffects(
  root: FiberRootNode,
  parentFiber: FiberNode,
  lanes: Lanes,
): void {
  // 删除副作用可以出现在任何 fiber 类型上，且必须先于子树 effect 执行
  const deletions = parentFiber.deletions;
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i];
      commitDeletionEffects(root, parentFiber, childToDelete);
    }
  }

  if (parentFiber.subtreeFlags & MutationMask) {
    let child = parentFiber.child;
    while (child !== null) {
      commitMutationEffectsOnFiber(child, root, lanes);
      child = child.sibling;
    }
  }
}

function commitMutationEffectsOnFiber(
  finishedWork: FiberNode,
  root: FiberRootNode,
  lanes: Lanes,
): void {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  switch (finishedWork.tag) {
    case HostComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      if (flags & Update) {
        const instance = finishedWork.stateNode;
        if (instance != null) {
          const newProps = finishedWork.memoizedProps;
          const oldProps = current !== null ? current.memoizedProps : newProps;
          const type = finishedWork.type;
          const updatePayload = finishedWork.updateQueue;
          finishedWork.updateQueue = null;
          if (updatePayload !== null) {
            commitUpdate(
              instance,
              updatePayload,
              type,
              oldProps,
              newProps,
              finishedWork,
            );
          }
        }
      }
      return;
    }
    case HostText: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      if (flags & Update) {
        if (finishedWork.stateNode === null) {
          throw new Error(
            "This should have a text node initialized. This error is likely " +
              "caused by a bug in React. Please file an issue.",
          );
        }
        const textInstance = finishedWork.stateNode;
        const newText = finishedWork.memoizedProps;
        const oldText = current !== null ? current.memoizedProps : newText;
        commitTextUpdate(textInstance, oldText, newText);
      }
      return;
    }
    case HostRoot: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      return;
    }
    case FunctionComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      // 对照官方：layout effect 的销毁提前到 mutation 阶段（销毁旧值），挂载则统一放到
      // commit 完全结束、root.current 已切换之后的 commitLayoutEffects——这样能保证一棵树里
      // 所有兄弟组件的销毁都先跑完，才轮到任何一个组件挂载新的 layout effect，不会互相干扰。
      if (flags & Update) {
        commitHookEffectListUnmount(HookLayout | HookHasEffect, finishedWork);
      }
      return;
    }
    default: {
      // Fragment/Mode 等：无自身 DOM，只递归子树并处理 Placement
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      return;
    }
  }
}

export function commitMutationEffects(
  root: FiberRootNode,
  finishedWork: FiberNode,
  committedLanes: Lanes,
): void {
  commitMutationEffectsOnFiber(finishedWork, root, committedLanes);
}

function recursivelyTraverseLayoutEffects(
  root: FiberRootNode,
  parentFiber: FiberNode,
): void {
  if (parentFiber.subtreeFlags & LayoutMask) {
    let child = parentFiber.child;
    while (child !== null) {
      commitLayoutEffectsOnFiber(root, child);
      child = child.sibling;
    }
  }
}

// 对照官方 commitClassCallbacks：processUpdateQueue 把带 callback 的 update 攒到
// updateQueue.effects（本项目复用 ReactFiberClassUpdateQueue.Update 这个数据结构），
// layout 子阶段统一执行并清空，保证 setState(partial, callback) 的 callback 在这里触发。
function commitClassCallbacks(finishedWork: FiberNode): void {
  const updateQueue = finishedWork.updateQueue;
  if (updateQueue === null) {
    return;
  }
  const effects: ClassUpdate<any>[] | null = updateQueue.effects;
  updateQueue.effects = null;
  if (effects !== null) {
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      const callback = effect.callback;
      if (callback !== null) {
        effect.callback = null;
        callback.call(finishedWork.stateNode);
      }
    }
  }
}

// 对照官方 commitLayoutEffectsOnFiber：mutation 阶段结束、root.current 已切换之后的
// 第二次遍历，只挂载 layout effect（销毁已经在 mutation 阶段做过了）。
function commitLayoutEffectsOnFiber(
  root: FiberRootNode,
  finishedWork: FiberNode,
): void {
  const flags = finishedWork.flags;

  switch (finishedWork.tag) {
    case FunctionComponent: {
      recursivelyTraverseLayoutEffects(root, finishedWork);
      if (flags & Update) {
        commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork);
      }
      return;
    }
    case ClassComponent: {
      recursivelyTraverseLayoutEffects(root, finishedWork);
      const instance = finishedWork.stateNode;
      if (flags & Update) {
        const current = finishedWork.alternate;
        if (current === null) {
          instance.componentDidMount();
        } else {
          const prevProps = current.memoizedProps;
          const prevState = current.memoizedState;
          instance.componentDidUpdate(
            prevProps,
            prevState,
            instance.__reactInternalSnapshotBeforeUpdate,
          );
        }
      }
      if (flags & Callback) {
        commitClassCallbacks(finishedWork);
      }
      return;
    }
    default: {
      recursivelyTraverseLayoutEffects(root, finishedWork);
      return;
    }
  }
}

export function commitLayoutEffects(
  finishedWork: FiberNode,
  root: FiberRootNode,
): void {
  commitLayoutEffectsOnFiber(root, finishedWork);
}

function recursivelyTraversePassiveMountEffects(
  root: FiberRootNode,
  parentFiber: FiberNode,
): void {
  if (parentFiber.subtreeFlags & PassiveMask) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveMountOnFiber(root, child);
      child = child.sibling;
    }
  }
}

// 对照官方 commitPassiveMountOnFiber：commit 完全结束后异步跑的一遍遍历，只挂载
// passive effect（useEffect）。销毁走 commitPassiveUnmountEffects，二者分开跑是因为
// 卸载可能发生在与本次渲染无关的更早 commit 里（比如上次渲染有、这次没有的组件）。
function commitPassiveMountOnFiber(
  root: FiberRootNode,
  finishedWork: FiberNode,
): void {
  const flags = finishedWork.flags;

  switch (finishedWork.tag) {
    case FunctionComponent: {
      recursivelyTraversePassiveMountEffects(root, finishedWork);
      if (flags & Update) {
        commitHookEffectListMount(HookPassive | HookHasEffect, finishedWork);
      }
      return;
    }
    default: {
      recursivelyTraversePassiveMountEffects(root, finishedWork);
      return;
    }
  }
}

export function commitPassiveMountEffects(
  root: FiberRootNode,
  finishedWork: FiberNode,
): void {
  commitPassiveMountOnFiber(root, finishedWork);
}

function recursivelyTraversePassiveUnmountEffects(
  parentFiber: FiberNode,
): void {
  if (parentFiber.subtreeFlags & PassiveMask) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveUnmountOnFiber(child);
      child = child.sibling;
    }
  }
}

// 对照官方 commitPassiveUnmountOnFiber：在 commitPassiveMountEffects 之前跑，保证同一个
// 组件"先销毁旧 effect，再挂载新 effect"的顺序（尽管这里销毁的是上一次渲染留下的 destroy，
// 挂载的是本次渲染新 push 的 effect，二者通过 fiber.updateQueue 是同一份数据，销毁一定要
// 先于挂载读到）。
function commitPassiveUnmountOnFiber(finishedWork: FiberNode): void {
  const flags = finishedWork.flags;

  switch (finishedWork.tag) {
    case FunctionComponent: {
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      if (flags & Update) {
        commitHookEffectListUnmount(HookPassive | HookHasEffect, finishedWork);
      }
      return;
    }
    default: {
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      return;
    }
  }
}

export function commitPassiveUnmountEffects(finishedWork: FiberNode): void {
  commitPassiveUnmountOnFiber(finishedWork);
}

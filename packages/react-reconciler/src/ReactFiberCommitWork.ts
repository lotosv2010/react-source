/**
 * @file commit 阶段（mutation 子阶段）
 * @description 将 render 阶段构建好的 Fiber 树变更应用到真实 DOM：插入/更新/删除
 */

import type { FiberNode } from "./ReactFiber";
import { MutationMask, Placement, Update } from "./ReactFiberFlags";
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
} from "./ReactFiberHostConfig";
import type { Lanes } from "./ReactFiberLane";
import type { FiberRootNode } from "./ReactFiberRoot";
import { HostComponent, HostPortal, HostRoot, HostText } from "./ReactWorkTags";

// 删除操作需要在向上回溯过程中临时记住"最近的 host 父节点"，官方用模块级变量在
// commitDeletionEffectsOnFiber 递归间传递。Phase 5 hooks 落地时这里还会加上卸载 effect 的清理。
let hostParent: any = null;
let hostParentIsContainer = false;

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
    default: {
      // 函数组件等没有自己 DOM 的节点：保持 hostParent 不变，继续向下找可移除的 host 节点
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
    default: {
      // 函数组件/Fragment/Mode 等：无自身 DOM，只递归子树并处理 Placement
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

/**
 * @file ChildFiber 协调器
 * @description reconcileChildren 的核心：对比 current 子 fiber 与新的 ReactElement 列表，
 * 决定复用/新建/删除，并标记 Placement/ChildDeletion 等副作用
 */

import {
  REACT_ELEMENT_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_PORTAL_TYPE,
} from "shared/ReactSymbols";

import {
  createFiberFromElement,
  createFiberFromFragment,
  createFiberFromPortal,
  createFiberFromText,
  createWorkInProgress,
  type FiberNode,
} from "./ReactFiber";
import { ChildDeletion, Placement } from "./ReactFiberFlags";
import type { Lanes } from "./ReactFiberLane";
import { Fragment, HostPortal, HostText } from "./ReactWorkTags";

// 对照官方 packages/react-reconciler/src/ReactChildFiber.new.js：ChildReconciler 是一个
// 工厂函数，shouldTrackSideEffects=false 时（mountChildFibers）只构建 fiber 不标记副作用，
// true 时（reconcileChildFibers）标记 Placement/ChildDeletion。这样初次挂载（父 fiber 自身
// 已是 Placement）不会给整棵子树重复打 Placement，commit 阶段只挂顶层节点即可。

function isReactElement(obj: any): boolean {
  return (
    typeof obj === "object" &&
    obj !== null &&
    obj.$$typeof === REACT_ELEMENT_TYPE
  );
}

function isPortal(obj: any): boolean {
  return (
    typeof obj === "object" &&
    obj !== null &&
    obj.$$typeof === REACT_PORTAL_TYPE
  );
}

function isArrayLike(obj: any): boolean {
  return Array.isArray(obj);
}

/**
 * 创建 ChildReconciler 工厂
 * @param shouldTrackSideEffects - 是否标记副作用（挂载 false / 更新 true）
 */
function ChildReconciler(shouldTrackSideEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode): void {
    if (!shouldTrackSideEffects) {
      return;
    }
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  function deleteRemainingChildren(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
  ): null {
    if (!shouldTrackSideEffects) {
      return null;
    }
    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }

  // 把剩余的子 fiber 收集到一个 Map 里，key 优先用 fiber.key，无 key 用 index。
  // 这是多节点 diff 第三阶段的查找表，避免 O(n²) 的线性扫描。
  function mapRemainingChildren(
    currentFirstChild: FiberNode | null,
  ): Map<string | number, FiberNode> {
    const existingChildren: Map<string | number, FiberNode> = new Map();

    let existingChild = currentFirstChild;
    while (existingChild !== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }

  // 复用旧 fiber 作为 workInProgress：clone 出 alternate，并把 sibling/index 归零
  // （这是最容易忘记的两处，所以官方集中在这里处理）
  function useFiber(fiber: FiberNode, pendingProps: any): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  // 根据新旧 index 判断节点是否需要移动：oldIndex < lastPlacedIndex 说明相对顺序变了
  function placeChild(
    newFiber: FiberNode,
    lastPlacedIndex: number,
    newIndex: number,
  ): number {
    newFiber.index = newIndex;
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex;
    }
    const current = newFiber.alternate;
    if (current !== null) {
      const oldIndex = current.index;
      if (oldIndex < lastPlacedIndex) {
        // 需要移动
        newFiber.flags |= Placement;
        return lastPlacedIndex;
      } else {
        // 原地保留
        return oldIndex;
      }
    } else {
      // 新建节点，需要插入
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
  }

  function placeSingleChild(newFiber: FiberNode): FiberNode {
    // 单节点场景只需给新建节点打 Placement
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags |= Placement;
    }
    return newFiber;
  }

  function updateTextNode(
    returnFiber: FiberNode,
    current: FiberNode | null,
    textContent: string,
    lanes: Lanes,
  ): FiberNode {
    if (current === null || current.tag !== HostText) {
      // 新建
      const created = createFiberFromText(textContent, returnFiber.mode, lanes);
      created.return = returnFiber;
      return created;
    } else {
      // 复用
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      return existing;
    }
  }

  function updateElement(
    returnFiber: FiberNode,
    current: FiberNode | null,
    element: any,
    lanes: Lanes,
  ): FiberNode {
    const elementType = element.type;
    if (elementType === REACT_FRAGMENT_TYPE) {
      return updateFragment(
        returnFiber,
        current,
        element.props.children,
        lanes,
        element.key,
      );
    }
    if (current !== null && current.elementType === elementType) {
      // 类型相同，复用旧 fiber
      const existing = useFiber(current, element.props);
      existing.ref = element.ref;
      existing.return = returnFiber;
      return existing;
    }
    // 类型不同，新建（旧节点由调用方 deleteChild）
    const created = createFiberFromElement(element, returnFiber.mode, lanes);
    created.ref = element.ref;
    created.return = returnFiber;
    return created;
  }

  function updateFragment(
    returnFiber: FiberNode,
    current: FiberNode | null,
    fragment: any,
    lanes: Lanes,
    key: string | null,
  ): FiberNode {
    if (current === null || current.tag !== Fragment) {
      // 新建
      const created = createFiberFromFragment(
        fragment,
        returnFiber.mode,
        lanes,
        key,
      );
      created.return = returnFiber;
      return created;
    } else {
      // 复用
      const existing = useFiber(current, fragment);
      existing.return = returnFiber;
      return existing;
    }
  }

  // 对照官方 updatePortal：Portal 复用条件除了 tag 相同，还要求 containerInfo/implementation
  // 都相同——挂载目标变了本质上是另一棵子树，直接新建。
  function updatePortal(
    returnFiber: FiberNode,
    current: FiberNode | null,
    portal: any,
    lanes: Lanes,
  ): FiberNode {
    if (
      current === null ||
      current.tag !== HostPortal ||
      current.stateNode.containerInfo !== portal.containerInfo ||
      current.stateNode.implementation !== portal.implementation
    ) {
      const created = createFiberFromPortal(portal, returnFiber.mode, lanes);
      created.return = returnFiber;
      return created;
    } else {
      const existing = useFiber(current, portal.children || []);
      existing.return = returnFiber;
      return existing;
    }
  }

  function createChild(
    returnFiber: FiberNode,
    newChild: any,
    lanes: Lanes,
  ): FiberNode | null {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      // 文本节点没有 key，可以直接替换
      const created = createFiberFromText(
        "" + newChild,
        returnFiber.mode,
        lanes,
      );
      created.return = returnFiber;
      return created;
    }

    if (typeof newChild === "object" && newChild !== null) {
      if (isReactElement(newChild)) {
        const created = createFiberFromElement(
          newChild,
          returnFiber.mode,
          lanes,
        );
        created.ref = newChild.ref;
        created.return = returnFiber;
        return created;
      }

      if (isPortal(newChild)) {
        const created = createFiberFromPortal(
          newChild,
          returnFiber.mode,
          lanes,
        );
        created.return = returnFiber;
        return created;
      }

      if (isArrayLike(newChild)) {
        const created = createFiberFromFragment(
          newChild,
          returnFiber.mode,
          lanes,
          null,
        );
        created.return = returnFiber;
        return created;
      }
    }

    // 其余类型（null/undefined/boolean 等）不生成 fiber
    return null;
  }

  // 第一阶段（数组头部遍历）：slot 位置逐个尝试用 updateSlot 匹配 key
  function updateSlot(
    returnFiber: FiberNode,
    oldFiber: FiberNode | null,
    newChild: any,
    lanes: Lanes,
  ): FiberNode | null {
    const key = oldFiber !== null ? oldFiber.key : null;

    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      // 文本节点没有 key，旧节点有 key 则不匹配
      if (key !== null) {
        return null;
      }
      return updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
    }

    if (typeof newChild === "object" && newChild !== null) {
      if (isReactElement(newChild)) {
        if (newChild.key === key) {
          return updateElement(returnFiber, oldFiber, newChild, lanes);
        } else {
          return null;
        }
      }
      if (isPortal(newChild)) {
        if (newChild.key === key) {
          return updatePortal(returnFiber, oldFiber, newChild, lanes);
        } else {
          return null;
        }
      }
      if (isArrayLike(newChild)) {
        if (key !== null) {
          return null;
        }
        return updateFragment(returnFiber, oldFiber, newChild, lanes, null);
      }
    }

    return null;
  }

  // 第三阶段：从 Map 里按 key/index 找可复用的旧节点
  function updateFromMap(
    existingChildren: Map<string | number, FiberNode>,
    returnFiber: FiberNode,
    newIdx: number,
    newChild: any,
    lanes: Lanes,
  ): FiberNode | null {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(returnFiber, matchedFiber, "" + newChild, lanes);
    }

    if (typeof newChild === "object" && newChild !== null) {
      if (isReactElement(newChild)) {
        const matchedFiber =
          existingChildren.get(newChild.key === null ? newIdx : newChild.key) ||
          null;
        return updateElement(returnFiber, matchedFiber, newChild, lanes);
      }
      if (isPortal(newChild)) {
        const matchedFiber =
          existingChildren.get(newChild.key === null ? newIdx : newChild.key) ||
          null;
        return updatePortal(returnFiber, matchedFiber, newChild, lanes);
      }
      if (isArrayLike(newChild)) {
        const matchedFiber = existingChildren.get(newIdx) || null;
        return updateFragment(returnFiber, matchedFiber, newChild, lanes, null);
      }
    }

    return null;
  }

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    element: any,
    lanes: Lanes,
  ): FiberNode {
    const key = element.key;
    let child = currentFirstChild;
    while (child !== null) {
      if (child.key === key) {
        const elementType = element.type;
        if (elementType === REACT_FRAGMENT_TYPE) {
          if (child.tag === Fragment) {
            deleteRemainingChildren(returnFiber, child.sibling);
            const existing = useFiber(child, element.props.children);
            existing.return = returnFiber;
            return existing;
          }
        } else {
          if (child.elementType === elementType) {
            deleteRemainingChildren(returnFiber, child.sibling);
            const existing = useFiber(child, element.props);
            existing.ref = element.ref;
            existing.return = returnFiber;
            return existing;
          }
        }
        // key 相同但 type 不同，删掉它及其后面的兄弟
        deleteRemainingChildren(returnFiber, child);
        break;
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    // 没找到可复用的，新建
    if (element.type === REACT_FRAGMENT_TYPE) {
      const created = createFiberFromFragment(
        element.props.children,
        returnFiber.mode,
        lanes,
        element.key,
      );
      created.return = returnFiber;
      return created;
    } else {
      const created = createFiberFromElement(element, returnFiber.mode, lanes);
      created.ref = element.ref;
      created.return = returnFiber;
      return created;
    }
  }

  // 对照官方 reconcileSinglePortal：单 Portal 场景的复用条件与 updatePortal 一致
  // （tag/containerInfo/implementation 都要匹配），结构上和 reconcileSingleElement 平行。
  function reconcileSinglePortal(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    portal: any,
    lanes: Lanes,
  ): FiberNode {
    const key = portal.key;
    let child = currentFirstChild;
    while (child !== null) {
      if (child.key === key) {
        if (
          child.tag === HostPortal &&
          child.stateNode.containerInfo === portal.containerInfo &&
          child.stateNode.implementation === portal.implementation
        ) {
          deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, portal.children || []);
          existing.return = returnFiber;
          return existing;
        } else {
          deleteRemainingChildren(returnFiber, child);
          break;
        }
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    const created = createFiberFromPortal(portal, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    textContent: string,
    lanes: Lanes,
  ): FiberNode {
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
      // 已有文本节点，更新并删除多余兄弟
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
      const existing = useFiber(currentFirstChild, textContent);
      existing.return = returnFiber;
      return existing;
    }
    // 现有首子节点不是文本，删掉所有旧的，新建
    deleteRemainingChildren(returnFiber, currentFirstChild);
    const created = createFiberFromText(textContent, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  }

  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChildren: any[],
    lanes: Lanes,
  ): FiberNode | null {
    // 官方注释：这个算法不追求从两端同时搜索的最优解（因为没有前向指针），
    // 而是分三个阶段：头部逐个 slot 匹配 → 剩余全新建/全删除的快路径 → Map 查找。
    let resultingFirstChild: FiberNode | null = null;
    let previousNewFiber: FiberNode | null = null;

    let oldFiber = currentFirstChild;
    let lastPlacedIndex = 0;
    let newIdx = 0;
    let nextOldFiber = null;

    // 第一轮：新旧数组头部逐位对比，key 相同则复用，不同则中断
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }
      const newFiber = updateSlot(
        returnFiber,
        oldFiber,
        newChildren[newIdx],
        lanes,
      );
      if (newFiber === null) {
        if (oldFiber === null) {
          oldFiber = nextOldFiber;
        }
        break;
      }
      if (shouldTrackSideEffects) {
        if (oldFiber && newFiber.alternate === null) {
          // 匹配到了 slot 但没复用旧 fiber（比如 type 变了），删除旧节点
          deleteChild(returnFiber, oldFiber);
        }
      }
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    if (newIdx === newChildren.length) {
      // 新 children 到头了，删除多余的旧节点
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }

    if (oldFiber === null) {
      // 旧节点用完，剩余全部新建
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
        if (newFiber === null) {
          continue;
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
      return resultingFirstChild;
    }

    // 新旧都有剩余：旧节点建 Map，遍历新节点查 Map 决定复用/新建
    const existingChildren = mapRemainingChildren(oldFiber);

    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx],
        lanes,
      );
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          if (newFiber.alternate !== null) {
            // 复用了旧 fiber，从 Map 移除，避免后面被当成删除
            existingChildren.delete(
              newFiber.key === null ? newIdx : newFiber.key,
            );
          }
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    if (shouldTrackSideEffects) {
      // Map 里剩下的都是没被消费的旧节点，全部删除
      existingChildren.forEach((child) => deleteChild(returnFiber, child));
    }

    return resultingFirstChild;
  }

  // 入口：根据 newChild 的形态分发到单元素/单文本/数组三种协调器
  function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any,
    lanes: Lanes,
  ): FiberNode | null {
    // 顶层无 key 的 Fragment 当作数组处理（<>...</> 与 <>[...]</> 在这里语义一致）
    const isUnkeyedTopLevelFragment =
      typeof newChild === "object" &&
      newChild !== null &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      newChild.key === null;
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild.props.children;
    }

    if (typeof newChild === "object" && newChild !== null) {
      if (isReactElement(newChild)) {
        return placeSingleChild(
          reconcileSingleElement(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes,
          ),
        );
      }
      if (isPortal(newChild)) {
        return placeSingleChild(
          reconcileSinglePortal(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes,
          ),
        );
      }
      if (isArrayLike(newChild)) {
        return reconcileChildrenArray(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes,
        );
      }
    }

    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      return placeSingleChild(
        reconcileSingleTextNode(
          returnFiber,
          currentFirstChild,
          "" + newChild,
          lanes,
        ),
      );
    }

    // 剩余情况（null/undefined/boolean 等）都视为空，删除所有旧节点
    return deleteRemainingChildren(returnFiber, currentFirstChild);
  }

  return reconcileChildFibers;
}

/**
 * 更新场景的 child 协调器（标记 Placement/ChildDeletion 副作用）
 */
export const reconcileChildFibers = ChildReconciler(true);

/**
 * 挂载场景的 child 协调器（不标记副作用，父 fiber 自身已带 Placement）
 */
export const mountChildFibers = ChildReconciler(false);

/**
 * bailout 时克隆整个子树（复用所有 child/sibling 结构，不重新 diff）
 * @param current - current fiber
 * @param workInProgress - workInProgress fiber
 */
export function cloneChildFibers(
  current: FiberNode | null,
  workInProgress: FiberNode,
): void {
  if (current !== null && workInProgress.child !== current.child) {
    throw new Error("Resuming work not yet implemented.");
  }

  if (workInProgress.child === null) {
    return;
  }

  let currentChild = workInProgress.child;
  let newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
  workInProgress.child = newChild;

  newChild.return = workInProgress;
  while (currentChild.sibling !== null) {
    currentChild = currentChild.sibling;
    newChild = newChild.sibling = createWorkInProgress(
      currentChild,
      currentChild.pendingProps,
    );
    newChild.return = workInProgress;
  }
  newChild.sibling = null;
}

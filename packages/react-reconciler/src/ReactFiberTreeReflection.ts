/**
 * @file Fiber 树反射工具
 * @description 在双缓存 Fiber 树上做只读查询：判断挂载状态、定位真实 DOM 节点等
 */

import { Placement } from "./ReactFiberFlags";
import { FiberNode } from "./ReactFiber";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";

// 对照官方 packages/react-reconciler/src/ReactFiberTreeReflection.js 的
// getNearestMountedFiber：从任意 Fiber 出发，找到离它最近的、已经挂载到页面上的 Fiber。
// 分两阶段向上走 return 指针——第一阶段处理"还没 alternate 的新树"（新建但可能还没插入），
// 遇到 Placement 标记就把它的父节点记成候选；第二阶段一路走到根，如果根是 HostRoot
// 说明整棵树确实挂载在页面上，返回候选；如果没走到 HostRoot（树是孤立的），返回 null。
/**
 * 找到离给定 Fiber 最近的已挂载 Fiber
 * @param fiber - 起始 Fiber
 * @returns 最近的已挂载 Fiber，如果整棵树未挂载则返回 null
 */
export function getNearestMountedFiber(fiber: FiberNode): FiberNode | null {
  let node = fiber;
  let nearestMounted: FiberNode | null = fiber;

  if (!fiber.alternate) {
    // 还没有 alternate，说明这是本次渲染新建的 Fiber，沿途记录候选挂载点
    let nextNode: FiberNode | null = node;
    do {
      node = nextNode;
      if ((node.flags & Placement) !== 0) {
        nearestMounted = node.return;
      }
      nextNode = node.return;
    } while (nextNode);
  } else {
    // 已经有 alternate，说明这个 Fiber 至少经历过一次 commit，继续往上走确认整棵树挂载状态
    while (node.return) {
      node = node.return;
    }
  }

  if (node.tag === HostRoot) {
    return nearestMounted;
  }

  // 没有走到 HostRoot，说明这棵树是被删除的孤立子树
  return null;
}

// 对照官方 findCurrentHostFiber：从给定 Fiber 开始，深度优先遍历 child/sibling，
// 找到第一个真实 DOM 节点对应的 Fiber（HostComponent/HostText）。
/**
 * 从给定 Fiber 开始，深度优先查找第一个真实 DOM 节点对应的 Fiber
 * @param parent - 起始 Fiber
 * @returns 第一个 HostComponent/HostText Fiber，找不到则返回 null
 */
export function findCurrentHostFiber(parent: FiberNode): FiberNode | null {
  let node: FiberNode = parent;
  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) {
      return node;
    } else if (node.child) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === parent) {
      return null;
    }
    while (!node.sibling) {
      if (!node.return || node.return === parent) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

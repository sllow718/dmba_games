import { TRAIN } from "./data";
import { grow, prune } from "./engine";
import type { TreeNode } from "./engine";

/** Grown until every leaf is pure: four leaves, 12 of 12 right on the training set. */
export const FULL_TREE = grow(TRAIN);

/** The full tree with the Income ≤ $75k branch pruned: Mr Lim's working tree. */
export const BANK_TREE = prune(FULL_TREE, new Set(["rn"]));

export function findNode(node: TreeNode, id: string): TreeNode | undefined {
  if (node.id === id) return node;
  return (node.yes && findNode(node.yes, id)) || (node.no && findNode(node.no, id)) || undefined;
}

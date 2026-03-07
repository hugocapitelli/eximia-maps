import type { MindMapNode, MindMapEdge } from "@/lib/types/mind-map";

interface LayoutOptions {
  horizontalSpacing?: number;
  verticalSpacing?: number;
}

/**
 * 4-quadrant radial mind map layout.
 * Root children are distributed across 4 quadrants:
 *   Q1: top-right, Q2: bottom-right, Q3: bottom-left, Q4: top-left
 * Each subtree inherits its parent's horizontal direction (left/right).
 */
export function layoutMindMap(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  options: LayoutOptions = {}
): MindMapNode[] {
  const {
    horizontalSpacing = 280,
    verticalSpacing = 80,
  } = options;

  if (nodes.length === 0) return nodes;

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build adjacency (parent → children)
  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const children = childrenOf.get(edge.source) || [];
    children.push(edge.target);
    childrenOf.set(edge.source, children);
    hasParent.add(edge.target);
  }

  const root = nodes.find((n) => n.data.level === 0) ||
    nodes.find((n) => !hasParent.has(n.id)) ||
    nodes[0];
  if (!root) return nodes;

  // Collect all descendant IDs for a given node (used for shifting quadrants)
  function collectDescendants(nodeId: string): Set<string> {
    const result = new Set<string>();
    const stack = [nodeId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (result.has(id)) continue;
      result.add(id);
      for (const child of childrenOf.get(id) || []) {
        if (nodeIds.has(child)) stack.push(child);
      }
    }
    return result;
  }

  // Measure subtree leaf-count height (independent of positioning state)
  function subtreeWeight(nodeId: string, seen: Set<string>): number {
    if (seen.has(nodeId)) return 0;
    seen.add(nodeId);
    const children = (childrenOf.get(nodeId) || []).filter(
      (c) => !seen.has(c) && nodeIds.has(c)
    );
    if (children.length === 0) return verticalSpacing;
    return children.reduce((sum, c) => sum + subtreeWeight(c, seen), 0);
  }

  const positioned = new Map<string, { x: number; y: number }>();
  const nodeSide = new Map<string, "left" | "right">();

  // Position a subtree growing downward from yStart. Returns next Y.
  function positionSubtree(
    nodeId: string,
    x: number,
    yStart: number,
    dir: "left" | "right",
    placed: Set<string>
  ): number {
    if (placed.has(nodeId)) return yStart;
    placed.add(nodeId);
    nodeSide.set(nodeId, dir);

    const children = (childrenOf.get(nodeId) || []).filter(
      (c) => !placed.has(c) && nodeIds.has(c)
    );

    if (children.length === 0) {
      positioned.set(nodeId, { x, y: yStart });
      return yStart + verticalSpacing;
    }

    const dx = dir === "right" ? horizontalSpacing : -horizontalSpacing;
    let currentY = yStart;
    const childYs: number[] = [];

    for (const cid of children) {
      currentY = positionSubtree(cid, x + dx, currentY, dir, placed);
      childYs.push(positioned.get(cid)!.y);
    }

    positioned.set(nodeId, {
      x,
      y: (childYs[0] + childYs[childYs.length - 1]) / 2,
    });
    return currentY;
  }

  const rootChildren = (childrenOf.get(root.id) || []).filter((c) => nodeIds.has(c));

  if (rootChildren.length === 0) {
    positioned.set(root.id, { x: 0, y: 0 });
  } else {
    // Measure weights BEFORE any positioning
    const weights = rootChildren.map((cid) => ({
      id: cid,
      weight: subtreeWeight(cid, new Set([root.id])),
    }));

    // Sort descending for greedy balancing
    weights.sort((a, b) => b.weight - a.weight);

    // 4 quadrants: [0]=top-right, [1]=bottom-right, [2]=bottom-left, [3]=top-left
    const quads: { ids: string[]; w: number }[] = Array.from({ length: 4 }, () => ({
      ids: [],
      w: 0,
    }));

    for (const child of weights) {
      let minIdx = 0;
      for (let i = 1; i < 4; i++) {
        if (quads[i].w < quads[minIdx].w) minIdx = i;
      }
      quads[minIdx].ids.push(child.id);
      quads[minIdx].w += child.weight;
    }

    const gap = verticalSpacing * 0.5;
    const placed = new Set<string>([root.id]);

    // Helper: position a quadrant's subtrees, then shift so they sit in the correct vertical zone
    function layoutQuadrant(
      quadIdx: number,
      dir: "left" | "right",
      goUp: boolean
    ) {
      const ids = quads[quadIdx].ids;
      if (ids.length === 0) return;

      // Collect all node IDs that belong to this quadrant
      const memberIds = new Set<string>();
      for (const cid of ids) {
        for (const d of collectDescendants(cid)) memberIds.add(d);
      }

      // Position all subtrees downward from 0
      let extent = 0;
      for (const cid of ids) {
        extent = positionSubtree(cid, dir === "right" ? horizontalSpacing : -horizontalSpacing, extent, dir, placed);
      }

      if (goUp) {
        // Shift everything upward so the bottom edge is at -gap
        const shift = -extent - gap;
        for (const id of memberIds) {
          const pos = positioned.get(id);
          if (pos) positioned.set(id, { x: pos.x, y: pos.y + shift });
        }
      } else {
        // Shift everything so top edge starts at +gap
        const shift = gap;
        for (const id of memberIds) {
          const pos = positioned.get(id);
          if (pos) positioned.set(id, { x: pos.x, y: pos.y + shift });
        }
      }
    }

    // Q1: top-right (goes UP, direction RIGHT)
    layoutQuadrant(0, "right", true);
    // Q2: bottom-right (goes DOWN, direction RIGHT)
    layoutQuadrant(1, "right", false);
    // Q3: bottom-left (goes DOWN, direction LEFT)
    layoutQuadrant(2, "left", false);
    // Q4: top-left (goes UP, direction LEFT)
    layoutQuadrant(3, "left", true);

    // Root at center
    positioned.set(root.id, { x: 0, y: 0 });
    nodeSide.set(root.id, "right");
  }

  // Orphan nodes
  const allYs = [...positioned.values()].map((p) => p.y);
  let orphanY = (allYs.length > 0 ? Math.max(...allYs) : 0) + verticalSpacing * 2;
  for (const node of nodes) {
    if (!positioned.has(node.id)) {
      positioned.set(node.id, { x: 0, y: orphanY });
      nodeSide.set(node.id, "right");
      orphanY += verticalSpacing;
    }
  }

  return nodes.map((node) => {
    const pos = positioned.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
      data: { ...node.data, side: nodeSide.get(node.id) || "right" },
    };
  });
}

import type { MindMapNode, MindMapEdge } from "@/lib/types/mind-map";
import { NODE_COLORS } from "@/lib/types/mind-map";
import type { MindMapAIOutput } from "./schema";
import { layoutMindMap } from "@/lib/utils/layout";

export function transformAIToReactFlow(output: MindMapAIOutput): {
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
} {
  // ── Step 0: Force single root ──────────────────────────────────────────
  // If AI returned multiple roots (parentId: null), create a synthetic root
  const rootNodes = output.nodes.filter((n) => !n.parentId);
  let aiNodes = [...output.nodes];

  if (rootNodes.length > 1) {
    const syntheticRoot = {
      id: "node-0",
      label: output.title,
      description: undefined,
      parentId: null,
    };
    // Make all old roots children of the synthetic root
    aiNodes = [
      syntheticRoot,
      ...aiNodes.map((n) =>
        !n.parentId ? { ...n, parentId: "node-0" } : n
      ),
    ];
  }

  const nodeMap = new Map(aiNodes.map((n) => [n.id, n]));

  // ── Step 1: Determine levels ───────────────────────────────────────────
  const levels = new Map<string, number>();
  function getLevel(id: string): number {
    if (levels.has(id)) return levels.get(id)!;
    const node = nodeMap.get(id);
    if (!node || !node.parentId) {
      levels.set(id, 0);
      return 0;
    }
    const level = getLevel(node.parentId) + 1;
    levels.set(id, level);
    return level;
  }
  aiNodes.forEach((n) => getLevel(n.id));

  // ── Step 2: Assign colors per branch ───────────────────────────────────
  const branchColors = new Map<string, string>();
  let colorIndex = 1;
  function getBranchColor(id: string): string {
    if (branchColors.has(id)) return branchColors.get(id)!;
    const node = nodeMap.get(id);
    if (!node || !node.parentId) {
      branchColors.set(id, NODE_COLORS[0]);
      return NODE_COLORS[0];
    }
    const level = levels.get(id) || 0;
    if (level === 1) {
      const color = NODE_COLORS[colorIndex % NODE_COLORS.length];
      colorIndex++;
      branchColors.set(id, color);
      return color;
    }
    const parentColor = getBranchColor(node.parentId);
    branchColors.set(id, parentColor);
    return parentColor;
  }
  aiNodes.forEach((n) => getBranchColor(n.id));

  // ── Step 3: Build ReactFlow nodes ──────────────────────────────────────
  const nodes: MindMapNode[] = aiNodes.map((n) => ({
    id: n.id,
    type: "mindmap",
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      description: n.description,
      color: branchColors.get(n.id) || NODE_COLORS[0],
      level: levels.get(n.id) || 0,
    },
  }));

  // ── Step 4: Build edges ────────────────────────────────────────────────
  const edgesRaw = aiNodes
    .filter((n) => n.parentId)
    .map((n) => ({
      id: `edge-${n.parentId}-${n.id}`,
      source: n.parentId!,
      target: n.id,
      type: "mindmap",
      data: { color: branchColors.get(n.id) || NODE_COLORS[0] },
    }));

  // ── Step 5: Layout (assigns positions + side) ──────────────────────────
  const layoutedNodes = layoutMindMap(nodes, edgesRaw);

  // Build side lookup
  const sideOf = new Map<string, string>();
  for (const node of layoutedNodes) {
    sideOf.set(node.id, (node.data.side as string) || "right");
  }

  // Set sourceHandle on edges FROM root to direct children
  const edges: MindMapEdge[] = edgesRaw.map((e) => {
    const sourceLevel = levels.get(e.source) || 0;
    if (sourceLevel === 0) {
      const targetSide = sideOf.get(e.target) || "right";
      return { ...e, sourceHandle: targetSide };
    }
    return e;
  });

  return {
    title: output.title,
    nodes: layoutedNodes,
    edges,
  };
}

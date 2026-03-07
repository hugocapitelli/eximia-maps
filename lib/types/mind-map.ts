import type { Node, Edge } from "@xyflow/react";

export interface MindMapNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  color: string;
  level: number; // 0 = root, 1 = branch, 2 = sub, 3 = leaf
  side?: "left" | "right"; // radial layout direction
  icon?: string;
}

export type MindMapNode = Node<MindMapNodeData>;
export type MindMapEdge = Edge;

export interface MindMap {
  id: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  prompt: string;
  style?: "default" | "academic" | "business" | "creative";
  depth?: number;
  language?: string;
}

export interface GenerateResponse {
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export const NODE_COLORS = [
  "#82B4C4", // root - teal
  "#C4A882", // branch 1 - brown
  "#7C9E8F", // branch 2 - sage
  "#8B9CC4", // branch 3 - atom blue
  "#C48BB4", // branch 4 - molecule pink
  "#C49E8B", // branch 5 - warm
  "#8BC4A8", // branch 6 - mint
  "#B4C482", // branch 7 - lime
  "#C4828B", // branch 8 - rose
] as const;

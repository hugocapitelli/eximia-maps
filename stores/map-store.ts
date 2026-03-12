import { create } from "zustand";
import { temporal } from "zundo";
import type { MindMapNode, MindMapEdge } from "@/lib/types/mind-map";
import { NODE_COLORS } from "@/lib/types/mind-map";
import { layoutMindMap } from "@/lib/utils/layout";

interface MapState {
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNodeId: string | null;
  isGenerating: boolean;
  isDirty: boolean;
  layoutVersion: number;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  reactFlowInstance: any;

  setTitle: (title: string) => void;
  setMap: (title: string, nodes: MindMapNode[], edges: MindMapEdge[]) => void;
  setNodes: (nodes: MindMapNode[]) => void;
  setEdges: (edges: MindMapEdge[]) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  updateNodeDescription: (nodeId: string, description: string) => void;
  updateNodeColor: (nodeId: string, color: string) => void;
  addNode: (node: MindMapNode, edge: MindMapEdge) => void;
  addChildNode: (parentId: string, label: string) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setGenerating: (isGenerating: boolean) => void;
  setReactFlowInstance: (instance: any) => void;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  autoLayout: () => void;
  markClean: () => void;
  clear: () => void;
}

let nextNodeId = 1000;

export const useMapStore = create<MapState>()(
  temporal(
    (set, get) => ({
      title: "",
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isGenerating: false,
      isDirty: false,
      layoutVersion: 0,
      reactFlowInstance: null,

      setTitle: (title) => set({ title, isDirty: true }),

      setMap: (title, nodes, edges) => set({ title, nodes, edges, isDirty: false }),

      setNodes: (nodes) => set({ nodes, isDirty: true }),

      setEdges: (edges) => set({ edges, isDirty: true }),

      updateNodeLabel: (nodeId, label) =>
        set((state) => ({
          isDirty: true,
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
          ),
        })),

      updateNodeDescription: (nodeId, description) =>
        set((state) => ({
          isDirty: true,
          nodes: state.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, description } }
              : n
          ),
        })),

      updateNodeColor: (nodeId, color) =>
        set((state) => ({
          isDirty: true,
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, color } } : n
          ),
        })),

      addNode: (node, edge) =>
        set((state) => ({
          isDirty: true,
          nodes: [...state.nodes, node],
          edges: [...state.edges, edge],
        })),

      addChildNode: (parentId, label) => {
        const state = get();
        const parent = state.nodes.find((n) => n.id === parentId);
        if (!parent) return;

        const parentLevel = (parent.data.level as number) || 0;
        const childLevel = parentLevel + 1;
        const siblingCount = state.edges.filter((e) => e.source === parentId).length;
        const color = childLevel === 1
          ? NODE_COLORS[siblingCount % NODE_COLORS.length]
          : (parent.data.color as string);

        const newId = `node-${++nextNodeId}`;
        const newNode: MindMapNode = {
          id: newId,
          type: "mindmap",
          position: {
            x: (parent.position?.x || 0) + 250,
            y: (parent.position?.y || 0) + siblingCount * 80,
          },
          data: { label, color, level: childLevel },
        };
        const newEdge: MindMapEdge = {
          id: `edge-${parentId}-${newId}`,
          source: parentId,
          target: newId,
          type: "mindmap",
          style: { stroke: color },
        };

        set({
          isDirty: true,
          nodes: [...state.nodes, newNode],
          edges: [...state.edges, newEdge],
          selectedNodeId: newId,
        });
      },

      removeNode: (nodeId) =>
        set((state) => {
          // Remove node and all descendants
          const toRemove = new Set<string>([nodeId]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const e of state.edges) {
              if (toRemove.has(e.source) && !toRemove.has(e.target)) {
                toRemove.add(e.target);
                changed = true;
              }
            }
          }
          return {
            isDirty: true,
            nodes: state.nodes.filter((n) => !toRemove.has(n.id)),
            edges: state.edges.filter(
              (e) => !toRemove.has(e.source) && !toRemove.has(e.target)
            ),
            selectedNodeId:
              state.selectedNodeId && toRemove.has(state.selectedNodeId)
                ? null
                : state.selectedNodeId,
          };
        }),

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      setGenerating: (isGenerating) => set({ isGenerating }),

      setReactFlowInstance: (instance) => set({ reactFlowInstance: instance }),

      autoLayout: () => {
        const state = get();
        if (state.nodes.length === 0) return;
        const layouted = layoutMindMap(state.nodes, state.edges);

        // Build side lookup and update edges with sourceHandle
        const sideOf = new Map<string, string>();
        for (const node of layouted) {
          sideOf.set(node.id, (node.data.side as string) || "right");
        }
        const updatedEdges = state.edges.map((e) => {
          const sourceNode = layouted.find((n) => n.id === e.source);
          const sourceLevel = (sourceNode?.data.level as number) ?? 1;
          if (sourceLevel === 0) {
            const targetSide = sideOf.get(e.target) || "right";
            return { ...e, sourceHandle: targetSide };
          }
          return e;
        });

        set({ nodes: layouted, edges: updatedEdges, isDirty: true, layoutVersion: state.layoutVersion + 1 });
      },

      markClean: () => set({ isDirty: false }),

      clear: () =>
        set({ title: "", nodes: [], edges: [], selectedNodeId: null, isDirty: false }),
    }),
    {
      partialize: (state) => ({
        title: state.title,
        nodes: state.nodes,
        edges: state.edges,
      }),
    }
  )
);

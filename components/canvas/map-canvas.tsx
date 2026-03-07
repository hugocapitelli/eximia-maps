"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { MindMapNodeType } from "./mind-map-node";
import { MindMapEdgeType } from "./mind-map-edge";
import { useMapStore } from "@/stores/map-store";
import type { MindMapNode, MindMapEdge } from "@/lib/types/mind-map";

const nodeTypes = { mindmap: MindMapNodeType };
const edgeTypes = { mindmap: MindMapEdgeType };

function MapCanvasInner() {
  const nodes = useMapStore((s) => s.nodes);
  const edges = useMapStore((s) => s.edges);
  const setNodes = useMapStore((s) => s.setNodes);
  const setEdges = useMapStore((s) => s.setEdges);
  const selectNode = useMapStore((s) => s.selectNode);
  const removeNode = useMapStore((s) => s.removeNode);
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const layoutVersion = useMapStore((s) => s.layoutVersion);
  const { fitView } = useReactFlow();
  const prevNodeCountRef = useRef(nodes.length);
  const prevLayoutVersionRef = useRef(layoutVersion);

  // Auto fitView when node count changes significantly (generation/import)
  useEffect(() => {
    const prev = prevNodeCountRef.current;
    const curr = nodes.length;
    prevNodeCountRef.current = curr;
    if (curr > 0 && Math.abs(curr - prev) !== 1) {
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 50);
    }
  }, [nodes.length, fitView]);

  // fitView when auto-layout is triggered
  useEffect(() => {
    if (layoutVersion !== prevLayoutVersionRef.current) {
      prevLayoutVersionRef.current = layoutVersion;
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 50);
    }
  }, [layoutVersion, fitView]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Tab = add child to selected node
      if (e.key === "Tab" && selectedNodeId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        const store = useMapStore.getState();
        store.addChildNode(selectedNodeId, "Novo node");
      }

      // Enter = add sibling (child of same parent)
      if (e.key === "Enter" && selectedNodeId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        const store = useMapStore.getState();
        const parentEdge = store.edges.find((edge) => edge.target === selectedNodeId);
        if (parentEdge) {
          store.addChildNode(parentEdge.source, "Novo node");
        }
      }

      // Delete/Backspace to remove selected node (but not root)
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        const node = nodes.find((n) => n.id === selectedNodeId);
        if (node && (node.data.level as number) > 0) {
          e.preventDefault();
          removeNode(selectedNodeId);
        }
      }
      // Escape to deselect
      if (e.key === "Escape" && selectedNodeId) {
        selectNode(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedNodeId, nodes, removeNode, selectNode]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes(applyNodeChanges(changes, nodes) as MindMapNode[]);
    },
    [nodes, setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges(applyEdgeChanges(changes, edges) as MindMapEdge[]);
    },
    [edges, setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: MindMapNode[] }) => {
      if (selectedNodes.length === 1) {
        selectNode(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        selectNode(null);
      }
    },
    [selectNode]
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "mindmap" as const,
      animated: false,
    }),
    []
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onSelectionChange={onSelectionChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.05}
      maxZoom={3}
      panOnDrag={true}
      panOnScroll
      zoomOnDoubleClick={false}
      multiSelectionKeyCode="Shift"
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="rgba(130, 180, 196, 0.08)"
      />
      <Controls
        showInteractive={false}
        className="!bottom-4 !left-4"
      />
      <MiniMap
        nodeStrokeWidth={3}
        className="!bottom-4 !right-4"
        maskColor="rgba(10, 10, 10, 0.7)"
        nodeColor={(node) => {
          return (node.data?.color as string) || "#82B4C4";
        }}
      />
    </ReactFlow>
  );
}

export function MapCanvas() {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <MapCanvasInner />
      </ReactFlowProvider>
    </div>
  );
}

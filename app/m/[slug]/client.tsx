"use client";

import { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MindMapNodeType } from "@/components/canvas/mind-map-node";
import { MindMapEdgeType } from "@/components/canvas/mind-map-edge";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";

const nodeTypes = { mindmap: MindMapNodeType };
const edgeTypes = { mindmap: MindMapEdgeType };

interface MapData {
  title: string;
  description: string | null;
  data: { nodes: any[]; edges: any[] };
  node_count: number;
}

function PublicCanvas({ mapData }: { mapData: MapData }) {
  return (
    <ReactFlow
      nodes={mapData.data.nodes}
      edges={mapData.data.edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.05}
      maxZoom={3}
      panOnDrag={true}
      panOnScroll
      zoomOnDoubleClick={false}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(130, 180, 196, 0.08)" />
      <Controls showInteractive={false} className="!bottom-4 !left-4" />
      <MiniMap
        nodeStrokeWidth={3}
        className="!bottom-4 !right-4"
        maskColor="rgba(10, 10, 10, 0.7)"
        nodeColor={(node) => (node.data?.color as string) || "#82B4C4"}
      />
    </ReactFlow>
  );
}

export function PublicMapView({ slug }: { slug: string }) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/maps/public/${slug}`);
        if (res.ok) {
          setMapData(await res.json());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-[#82B4C4]" size={32} />
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg gap-4">
        <p className="text-lg font-medium text-primary">Mapa nao encontrado</p>
        <p className="text-sm text-muted">Este mapa pode ter sido removido ou nao esta publicado.</p>
        <Link href="/" className="text-sm text-[#82B4C4] hover:underline">
          Voltar ao inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Header */}
      <header className="h-12 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-horizontal.svg" alt="eximIA" width={80} height={18} />
            <div className="h-4 w-px bg-border-light" />
            <span className="text-[10px] font-black tracking-[0.12em] text-[#82B4C4]">MAPS</span>
          </Link>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm text-cream-dim truncate max-w-[300px]">{mapData.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{mapData.node_count} nodes</span>
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#82B4C4] text-bg hover:bg-[#9AC8D6] transition-colors"
          >
            Criar meu mapa
            <ExternalLink size={12} />
          </Link>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlowProvider>
          <PublicCanvas mapData={mapData} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

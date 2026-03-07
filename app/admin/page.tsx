"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import {
  Map,
  Sparkles,
  Clock,
  TrendingUp,
  Plus,
  LayoutTemplate,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "@/components/ui";
import { formatRelative } from "@/lib/utils";

interface MapNodeData {
  label: string;
  color: string;
  level: number;
}

interface MapNode {
  id: string;
  position: { x: number; y: number };
  data: MapNodeData;
}

interface MapEdge {
  id: string;
  source: string;
  target: string;
}

interface MapData {
  nodes?: MapNode[];
  edges?: MapEdge[];
}

interface MapSummary {
  id: string;
  title: string;
  node_count: number;
  status: string;
  data: MapData | null;
  updated_at: string;
}

interface Stats {
  total: number;
  published: number;
  drafts: number;
  totalNodes: number;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function MapPreview({ nodes, edges }: { nodes: MapNode[]; edges: MapEdge[] }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="w-full h-24 rounded-lg bg-elevated/50 flex items-center justify-center">
        <Map size={20} className="text-muted/30" />
      </div>
    );
  }

  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 12;
  const svgW = 260;
  const svgH = 96;
  const innerW = svgW - padding * 2;
  const innerH = svgH - padding * 2;

  const scale = (n: MapNode) => ({
    x: padding + ((n.position.x - minX) / rangeX) * innerW,
    y: padding + ((n.position.y - minY) / rangeY) * innerH,
  });

  const nodeLookup: Record<string, MapNode> = {};
  for (const n of nodes) nodeLookup[n.id] = n;

  return (
    <div className="w-full h-24 rounded-lg bg-elevated/50 overflow-hidden">
      <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
        {edges.map((e) => {
          const src = nodeLookup[e.source];
          const tgt = nodeLookup[e.target];
          if (!src || !tgt) return null;
          const p1 = scale(src);
          const p2 = scale(tgt);
          return (
            <line
              key={e.id}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}
        {nodes.map((n) => {
          const p = scale(n);
          const isRoot = n.data.level === 0;
          return (
            <circle
              key={n.id}
              cx={p.x}
              cy={p.y}
              r={isRoot ? 4 : 2.5}
              fill={n.data.color || "#82B4C4"}
              opacity={isRoot ? 1 : 0.7}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, drafts: 0, totalNodes: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/maps");
        if (res.ok) {
          const data = await res.json();
          setMaps(data);
          setStats({
            total: data.length,
            published: data.filter((m: MapSummary) => m.status === "published").length,
            drafts: data.filter((m: MapSummary) => m.status === "draft").length,
            totalNodes: data.reduce((sum: number, m: MapSummary) => sum + (m.node_count || 0), 0),
          });
        }
      } catch {
        // Silent fail on dashboard
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: "Total de Mapas", value: stats.total, icon: Map, color: "#82B4C4" },
    { label: "Publicados", value: stats.published, icon: TrendingUp, color: "#22C55E" },
    { label: "Rascunhos", value: stats.drafts, icon: Clock, color: "#C4A882" },
    { label: "Total de Nodes", value: stats.totalNodes, icon: Sparkles, color: "#8B9CC4" },
  ];

  const quickActions = [
    { label: "Criar com IA", icon: Sparkles, color: "#82B4C4", href: "/admin/maps/new" },
    { label: "Usar Template", icon: LayoutTemplate, color: "#8B9CC4", href: "/admin/templates" },
    { label: "Importar Texto", icon: ClipboardPaste, color: "#C4A882", href: "/admin/maps/new" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{greeting}</h1>
          <p className="text-sm text-muted mt-1">Visão geral dos seus mapas mentais</p>
        </div>
        <Button onClick={() => router.push("/admin/maps/new")} className="gap-2">
          <Plus size={16} />
          Novo Mapa
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${s.color}15` }}
              >
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "-" : s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {quickActions.map((a) => (
          <Card
            key={a.label}
            className="p-4 cursor-pointer hover:border-opacity-30 transition-all group text-center"
            style={{ borderColor: "transparent" }}
            onClick={() => router.push(a.href)}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${a.color}40`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg mx-auto mb-2"
              style={{ backgroundColor: `${a.color}15` }}
            >
              <a.icon size={18} style={{ color: a.color }} />
            </div>
            <p className="text-sm font-medium">{a.label}</p>
          </Card>
        ))}
      </div>

      {/* Recent maps */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Mapas Recentes</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl border border-border bg-surface animate-pulse" />
            ))}
          </div>
        ) : maps.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <Map size={40} className="text-muted mb-3" />
            <p className="text-sm text-muted mb-4">Nenhum mapa criado ainda</p>
            <Button onClick={() => router.push("/admin/maps/new")} size="sm" className="gap-2">
              <Plus size={14} />
              Criar primeiro mapa
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.slice(0, 6).map((map) => (
              <Card
                key={map.id}
                className="p-4 cursor-pointer hover:border-[#82B4C4]/30 transition-colors group"
                onClick={() => router.push(`/admin/maps/${map.id}/edit`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#82B4C4]/10">
                    <Map size={14} className="text-[#82B4C4]" />
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      map.status === "published"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {map.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </div>
                <MapPreview
                  nodes={(map.data?.nodes as MapNode[]) || []}
                  edges={(map.data?.edges as MapEdge[]) || []}
                />
                <h3 className="font-medium text-sm group-hover:text-[#82B4C4] transition-colors truncate mt-3">
                  {map.title}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                  <span>{map.node_count || 0} nodes</span>
                  <span>&middot;</span>
                  <span>{formatRelative(map.updated_at)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

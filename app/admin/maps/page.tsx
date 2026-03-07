"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, Input, Dialog } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils";
import {
  Plus,
  Search,
  Map,
  MoreVertical,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MindMapItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  node_count: number;
  created_at: string;
  updated_at: string;
}

export default function MapsListPage() {
  const [maps, setMaps] = useState<MindMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const loadMaps = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/maps");
      if (res.ok) {
        setMaps(await res.json());
      }
    } catch {
      toast.error("Erro ao carregar mapas");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadMaps(); }, [loadMaps]);

  async function handleCreate() {
    try {
      const res = await fetch("/api/v1/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Mapa sem titulo" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/maps/${data.id}/edit`);
      }
    } catch {
      toast.error("Erro ao criar mapa");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/v1/maps/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setMaps((prev) => prev.filter((m) => m.id !== deleteId));
        toast.success("Mapa excluido");
      }
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeleteId(null);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/v1/maps/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        toast.success("Mapa duplicado");
        loadMaps();
      }
    } catch {
      toast.error("Erro ao duplicar");
    }
    setMenuOpen(null);
  }

  const filtered = maps.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Mapas</h1>
          <p className="text-sm text-muted mt-1">
            {maps.length} mapa{maps.length !== 1 ? "s" : ""} criado{maps.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus size={16} />
          Novo Mapa
        </Button>
      </div>

      {/* Search + View toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar mapas..."
            className="pl-9"
          />
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2.5 transition-colors", viewMode === "grid" ? "bg-elevated text-primary" : "text-muted hover:text-primary")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2.5 transition-colors", viewMode === "list" ? "bg-elevated text-primary" : "text-muted hover:text-primary")}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "flex flex-col gap-2"
        )}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={cn(
              "rounded-xl border border-border bg-surface animate-pulse",
              viewMode === "grid" ? "h-40" : "h-16"
            )} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Map size={48} className="text-muted mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {search ? "Nenhum mapa encontrado" : "Comece criando seu primeiro mapa"}
          </h3>
          <p className="text-sm text-muted mb-6 max-w-md">
            {search
              ? "Tente outro termo de busca"
              : "Use IA para gerar mapas mentais completos em segundos, ou crie do zero com nosso editor visual."}
          </p>
          {!search && (
            <Button onClick={handleCreate} className="gap-2">
              <Sparkles size={16} />
              Criar com IA
            </Button>
          )}
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((map) => (
            <Card
              key={map.id}
              className="p-4 cursor-pointer hover:border-[#82B4C4]/30 transition-all group relative"
              onClick={() => router.push(`/admin/maps/${map.id}/edit`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#82B4C4]/10">
                  <Map size={16} className="text-[#82B4C4]" />
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={map.status === "published" ? "success" : "info"}>
                    {map.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === map.id ? null : map.id); }}
                      className="p-1 rounded text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {menuOpen === map.id && (
                      <div className="absolute right-0 top-7 w-40 rounded-lg border border-border bg-surface shadow-xl z-20">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicate(map.id); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-cream-dim hover:bg-elevated"
                        >
                          <Copy size={12} /> Duplicar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(map.id); setMenuOpen(null); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/10"
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <h3 className="font-medium text-sm group-hover:text-[#82B4C4] transition-colors truncate mb-1">
                {map.title}
              </h3>
              {map.description && (
                <p className="text-xs text-muted truncate mb-2">{map.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>{map.node_count || 0} nodes</span>
                <span>&middot;</span>
                <span>{formatRelative(map.updated_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((map) => (
            <Card
              key={map.id}
              className="p-3 px-4 cursor-pointer hover:border-[#82B4C4]/30 transition-all group flex items-center gap-4"
              onClick={() => router.push(`/admin/maps/${map.id}/edit`)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#82B4C4]/10 shrink-0">
                <Map size={14} className="text-[#82B4C4]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm group-hover:text-[#82B4C4] transition-colors truncate">
                  {map.title}
                </h3>
              </div>
              <span className="text-xs text-muted shrink-0">{map.node_count || 0} nodes</span>
              <Badge variant={map.status === "published" ? "success" : "info"} className="shrink-0">
                {map.status === "published" ? "Publicado" : "Rascunho"}
              </Badge>
              <span className="text-xs text-muted shrink-0">{formatRelative(map.updated_at)}</span>
            </Card>
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir mapa">
        <p className="text-sm text-cream-dim mb-6">
          Tem certeza que deseja excluir este mapa? Esta acao nao pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Excluir</Button>
        </div>
      </Dialog>
    </div>
  );
}

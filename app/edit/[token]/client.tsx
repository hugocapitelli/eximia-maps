"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useMapStore } from "@/stores/map-store";
import { MapCanvas } from "@/components/canvas/map-canvas";
import { LeftPanel } from "@/components/editor/left-panel";
import { RightPanel } from "@/components/editor/right-panel";
import { useToast, ToastProvider } from "@/components/ui/toast";
import {
  Loader2,
  Save,
  CheckCircle2,
  Circle,
  Undo2,
  Redo2,
  LayoutGrid,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

function SharedEditorContent({ token }: { token: string }) {
  const toast = useToast();
  const { title, nodes, edges, setTitle, setMap, clear, markClean, autoLayout } = useMapStore();
  const isDirty = useMapStore((s) => s.isDirty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const undo = useMapStore.temporal.getState().undo;
  const redo = useMapStore.temporal.getState().redo;

  // Load map via share token
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/maps/shared/${token}`);
        if (res.ok) {
          const data = await res.json();
          setMap(data.title, data.data?.nodes || [], data.data?.edges || []);
        } else {
          setNotFound(true);
        }
      } catch {
        toast.error("Erro ao carregar mapa");
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, setMap, toast]);

  // Save via share token
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const state = useMapStore.getState();
      const res = await fetch(`/api/v1/maps/shared/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          data: { nodes: state.nodes, edges: state.edges },
        }),
      });
      if (res.ok) {
        markClean();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success("Mapa salvo");
      } else {
        toast.error("Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }, [token, toast, markClean]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSave]);

  // Auto-save debounce
  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      await handleSave();
      setAutoSaving(false);
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isDirty, handleSave]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-[#82B4C4]" size={32} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg gap-4">
        <Link2 size={48} className="text-muted" />
        <h1 className="text-xl font-semibold text-primary">Link invalido</h1>
        <p className="text-sm text-muted">Este link de edicao nao existe ou foi revogado.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Shared Editor Header */}
      <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-3 shrink-0 z-20">
        {/* Left */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo-horizontal.svg"
            alt="eximIA"
            width={80}
            height={18}
          />
          <div className="h-4 w-px bg-border-light" />
          <span className="text-[10px] font-black tracking-[0.12em] text-[#82B4C4]">MAPS</span>

          <div className="h-5 w-px bg-border" />

          {/* Title */}
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="bg-elevated/50 border-0 rounded px-2 py-0.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-[#82B4C4]/30 w-64"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm text-cream-dim hover:text-primary truncate max-w-[280px] transition-colors"
            >
              {title || "Sem titulo"}
            </button>
          )}

          {/* Save indicator */}
          <div className="flex items-center gap-1 ml-2">
            {saving ? (
              <span className="flex items-center gap-1 text-[10px] text-yellow-500/80 animate-pulse">
                <Loader2 size={10} className="animate-spin" />
                Salvando...
              </span>
            ) : saved ? (
              <span className="flex items-center gap-1 text-[10px] text-green-500/80 animate-fade-in">
                <CheckCircle2 size={10} />
                Salvo
              </span>
            ) : isDirty ? (
              <span className="flex items-center gap-1 text-[10px] text-orange-400/70">
                <Circle size={6} fill="currentColor" />
                Nao salvo
              </span>
            ) : null}
          </div>

          {/* Shared badge */}
          <div className="flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-md bg-[#82B4C4]/10 border border-[#82B4C4]/20">
            <Link2 size={10} className="text-[#82B4C4]" />
            <span className="text-[10px] font-medium text-[#82B4C4]">
              Editando via link compartilhado
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <div className="flex items-center bg-elevated/50 rounded-lg">
            <button
              onClick={() => undo()}
              className="p-1.5 rounded-l-lg text-muted hover:text-primary transition-colors disabled:opacity-30"
            >
              <Undo2 size={14} />
            </button>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={() => redo()}
              className="p-1.5 rounded-r-lg text-muted hover:text-primary transition-colors disabled:opacity-30"
            >
              <Redo2 size={14} />
            </button>
          </div>

          {/* Auto Layout */}
          <button
            onClick={autoLayout}
            disabled={nodes.length === 0}
            title="Reorganizar nodes automaticamente"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-[#82B4C4] hover:bg-[#82B4C4]/10 transition-colors disabled:opacity-30"
          >
            <LayoutGrid size={14} />
            Layout
          </button>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              isDirty && !saving
                ? "bg-[#82B4C4] text-bg hover:bg-[#9AC8D6]"
                : "bg-elevated text-muted"
            )}
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : saved ? (
              <CheckCircle2 size={13} />
            ) : (
              <Save size={13} />
            )}
            {saving ? "Salvando..." : saved ? "Salvo" : "Salvar"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <LeftPanel />

        {/* Canvas */}
        <div className="flex-1 relative">
          <MapCanvas />
          {autoSaving && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface/90 border border-border rounded-lg px-3 py-1.5 text-xs text-muted backdrop-blur-sm z-50">
              <Loader2 size={12} className="animate-spin text-[#82B4C4]" />
              Auto-salvando...
            </div>
          )}
        </div>

        {/* Right Panel */}
        <RightPanel />
      </div>
    </div>
  );
}

export function SharedEditView({ token }: { token: string }) {
  return (
    <ToastProvider>
      <SharedEditorContent token={token} />
    </ToastProvider>
  );
}

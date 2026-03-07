"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/stores/map-store";
import { MapCanvas } from "@/components/canvas/map-canvas";
import { EditorHeader } from "@/components/editor/editor-header";
import { LeftPanel } from "@/components/editor/left-panel";
import { RightPanel } from "@/components/editor/right-panel";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

function EditorContent({ mapId }: { mapId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { title, nodes, edges, setTitle, setMap, clear, markClean } = useMapStore();
  const isDirty = useMapStore((s) => s.isDirty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      if (mapId === "new") {
        clear();
        setTitle("Mapa sem titulo");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/v1/maps/${mapId}`);
        if (res.ok) {
          const data = await res.json();
          setMap(data.title, data.data?.nodes || [], data.data?.edges || []);
        } else {
          toast.error("Mapa nao encontrado");
          router.push("/admin/maps");
        }
      } catch {
        toast.error("Erro ao carregar mapa");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mapId, setMap, setTitle, clear, router, toast]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const state = useMapStore.getState();
      const method = mapId === "new" ? "POST" : "PUT";
      const url = mapId === "new" ? "/api/v1/maps" : `/api/v1/maps/${mapId}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          data: { nodes: state.nodes, edges: state.edges },
          node_count: state.nodes.length,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        markClean();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (mapId === "new") {
          router.replace(`/admin/maps/${data.id}/edit`);
        }
        toast.success("Mapa salvo");
      }
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }, [mapId, router, toast, markClean]);

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
    if (!isDirty || mapId === "new") return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      await handleSave();
      setAutoSaving(false);
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isDirty, mapId, handleSave]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-[#82B4C4]" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      <EditorHeader
        mapId={mapId}
        saving={saving}
        saved={saved}
        onSave={handleSave}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Tools */}
        <LeftPanel />

        {/* Canvas — Center */}
        <div className="flex-1 relative">
          <MapCanvas />
          {autoSaving && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface/90 border border-border rounded-lg px-3 py-1.5 text-xs text-muted backdrop-blur-sm z-50">
              <Loader2 size={12} className="animate-spin text-[#82B4C4]" />
              Auto-salvando...
            </div>
          )}
        </div>

        {/* Right Panel — Properties / Chat / Export */}
        <RightPanel />
      </div>
    </div>
  );
}

export default function EditPage({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId } = use(params);
  return (
    <ToastProvider>
      <EditorContent mapId={mapId} />
    </ToastProvider>
  );
}

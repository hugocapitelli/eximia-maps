"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Loader2,
  CheckCircle2,
  Circle,
  LayoutGrid,
} from "lucide-react";
import { useMapStore } from "@/stores/map-store";
import { cn } from "@/lib/utils/cn";

interface EditorHeaderProps {
  mapId: string;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

export function EditorHeader({ mapId, saving, saved, onSave }: EditorHeaderProps) {
  const router = useRouter();
  const { title, setTitle, isDirty, nodes, autoLayout } = useMapStore();
  const [editingTitle, setEditingTitle] = useState(false);

  const undo = useMapStore.temporal.getState().undo;
  const redo = useMapStore.temporal.getState().redo;

  const handleBack = () => {
    if (isDirty) {
      if (!window.confirm("Tem alteracoes nao salvas. Deseja sair?")) return;
    }
    router.push("/admin/maps");
  };

  return (
    <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-3 shrink-0 z-20">
      {/* Left */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleBack}
          className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="h-5 w-px bg-border" />

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
          onClick={onSave}
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
  );
}

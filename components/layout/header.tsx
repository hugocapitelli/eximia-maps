"use client";

import { useMapStore } from "@/stores/map-store";
import {
  Download,
  Undo2,
  Redo2,
  Trash2,
  FileText,
} from "lucide-react";

export function Header() {
  const { title, nodes, clear } = useMapStore();
  const store = useMapStore;

  const canUndo = (store as any).temporal?.getState()?.pastStates?.length > 0;
  const canRedo = (store as any).temporal?.getState()?.futureStates?.length > 0;

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      {/* Left: Branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-body font-medium text-cream-dim tracking-wide">
            eximIA
          </span>
          <div className="h-4 w-px bg-border-light" />
          <div className="flex flex-col">
            <span className="text-sm font-body font-black tracking-[0.15em] text-primary">
              MAPS
            </span>
            <div
              className="h-0.5 w-full rounded-full mt-0.5"
              style={{ backgroundColor: "#82B4C4", boxShadow: "0 0 8px #82B4C4" }}
            />
          </div>
        </div>

        {title && (
          <>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-cream-dim truncate max-w-[300px]">
              {title}
            </span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {nodes.length > 0 && (
          <>
            <button
              onClick={() => (store as any).temporal?.getState()?.undo()}
              disabled={!canUndo}
              className="p-2 rounded-lg text-cream-dim hover:bg-elevated hover:text-primary disabled:opacity-30 transition-colors"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={() => (store as any).temporal?.getState()?.redo()}
              disabled={!canRedo}
              className="p-2 rounded-lg text-cream-dim hover:bg-elevated hover:text-primary disabled:opacity-30 transition-colors"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            <button
              className="p-2 rounded-lg text-cream-dim hover:bg-elevated hover:text-primary transition-colors"
              title="Exportar"
            >
              <Download size={16} />
            </button>

            <button
              onClick={clear}
              className="p-2 rounded-lg text-cream-dim hover:bg-danger/20 hover:text-danger transition-colors"
              title="Limpar mapa"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

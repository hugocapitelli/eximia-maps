"use client";

import { useState, useCallback } from "react";
import { Download, Image, FileText, Code, Loader2 } from "lucide-react";
import { useMapStore } from "@/stores/map-store";
import { Button } from "@/components/ui";
import { toPng, toSvg } from "html-to-image";

export function ExportPanel() {
  const { title, nodes } = useMapStore();
  const [exporting, setExporting] = useState<string | null>(null);

  const getFlowElement = () =>
    document.querySelector(".react-flow") as HTMLElement | null;

  const handleExportPNG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    setExporting("png");
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#0A0A0A",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${title || "mapa-mental"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
    } finally {
      setExporting(null);
    }
  }, [title]);

  const handleExportSVG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    setExporting("svg");
    try {
      const dataUrl = await toSvg(el, {
        backgroundColor: "#0A0A0A",
      });
      const link = document.createElement("a");
      link.download = `${title || "mapa-mental"}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("SVG export failed:", err);
    } finally {
      setExporting(null);
    }
  }, [title]);

  const handleExportJSON = useCallback(() => {
    const store = useMapStore.getState();
    const data = {
      title: store.title,
      nodes: store.nodes,
      edges: store.edges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `${title || "mapa-mental"}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }, [title]);

  if (nodes.length === 0) {
    return (
      <div className="glass-panel p-4 text-center">
        <p className="text-xs text-muted">Crie um mapa primeiro para exportar</p>
      </div>
    );
  }

  const formats = [
    {
      id: "png",
      label: "PNG",
      desc: "Imagem de alta resolucao (2x)",
      icon: Image,
      action: handleExportPNG,
    },
    {
      id: "svg",
      label: "SVG",
      desc: "Vetorial, escalavel",
      icon: Code,
      action: handleExportSVG,
    },
    {
      id: "json",
      label: "JSON",
      desc: "Dados do mapa (importavel)",
      icon: FileText,
      action: handleExportJSON,
    },
  ];

  return (
    <div className="glass-panel p-4 animate-slide-in">
      <h3 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
        <Download size={14} className="text-[#82B4C4]" />
        Exportar
      </h3>
      <div className="space-y-2">
        {formats.map((f) => (
          <button
            key={f.id}
            onClick={f.action}
            disabled={!!exporting}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-[#82B4C4]/30 bg-bg/50 transition-all text-left disabled:opacity-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#82B4C4]/10 shrink-0">
              {exporting === f.id ? (
                <Loader2 size={14} className="text-[#82B4C4] animate-spin" />
              ) : (
                <f.icon size={14} className="text-[#82B4C4]" />
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-primary">{f.label}</div>
              <div className="text-[10px] text-muted">{f.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

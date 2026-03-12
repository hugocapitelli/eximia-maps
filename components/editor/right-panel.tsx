"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  MessageSquare,
  Download,
  Trash2,
  Plus,
  Send,
  Loader2,
  Bot,
  User,
  Settings2,
  Image,
  Code,
  FileText,
  FileDown,
  Sun,
  Moon,
} from "lucide-react";
import { useMapStore } from "@/stores/map-store";
import { NODE_COLORS } from "@/lib/types/mind-map";
import { cn } from "@/lib/utils/cn";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { getViewportForBounds } from "@xyflow/react";

type Tab = "properties" | "chat" | "export";

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("properties");
  const { selectedNodeId, nodes } = useMapStore();

  // Auto-switch to properties when a node is selected
  useEffect(() => {
    if (selectedNodeId) setActiveTab("properties");
  }, [selectedNodeId]);

  const tabs = [
    { id: "properties" as Tab, icon: SlidersHorizontal, label: "Propriedades" },
    { id: "chat" as Tab, icon: MessageSquare, label: "Chat IA" },
    { id: "export" as Tab, icon: Download, label: "Exportar" },
  ];

  return (
    <aside className="w-[340px] bg-surface/50 border-l border-border flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-[#82B4C4] text-[#82B4C4]"
                : "border-transparent text-muted hover:text-primary"
            )}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "properties" && <PropertiesPanel />}
        {activeTab === "chat" && <ChatPanel />}
        {activeTab === "export" && <ExportPanel />}
      </div>
    </aside>
  );
}

// ─── Properties Panel ───────────────────────────────────────────────────────

function PropertiesPanel() {
  const { selectedNodeId, nodes, updateNodeLabel, updateNodeDescription, updateNodeColor, removeNode, addChildNode } =
    useMapStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-elevated">
          <Settings2 size={24} className="text-muted" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-primary">Nenhum node selecionado</p>
          <p className="text-xs text-muted mt-1.5">Clique em um node no canvas para editar</p>
        </div>
      </div>
    );
  }

  const label = selectedNode.data.label as string;
  const description = (selectedNode.data.description as string) || "";
  const color = selectedNode.data.color as string;
  const level = selectedNode.data.level as number;
  const levelLabels = ["Raiz", "Branch", "Sub-item", "Folha"];
  const childCount = useMapStore.getState().edges.filter((e) => e.source === selectedNodeId).length;

  return (
    <div className="divide-y divide-border">
      {/* Node info header */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div
            className="h-3.5 w-3.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-medium text-muted uppercase tracking-wider">
            {levelLabels[level] || `Nivel ${level}`}
          </span>
          <span className="text-[11px] text-muted/50 ml-auto">
            {childCount} filho{childCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Label */}
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">Label</label>
          <input
            value={label}
            onChange={(e) => updateNodeLabel(selectedNodeId!, e.target.value)}
            className="w-full bg-bg/50 border border-border rounded-lg px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-[#82B4C4]/50 focus:ring-1 focus:ring-[#82B4C4]/20 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">Descricao</label>
          <textarea
            value={description}
            onChange={(e) => updateNodeDescription(selectedNodeId!, e.target.value)}
            placeholder="Opcional..."
            rows={3}
            className="w-full bg-bg/50 border border-border rounded-lg px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[#82B4C4]/50 focus:ring-1 focus:ring-[#82B4C4]/20 resize-none transition-colors"
          />
        </div>
      </div>

      {/* Color */}
      <div className="p-5 space-y-3">
        <label className="text-xs font-medium text-muted block">Cor</label>
        <div className="flex flex-wrap gap-2">
          {NODE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateNodeColor(selectedNodeId!, c)}
              className={cn(
                "h-7 w-7 rounded-md border-2 transition-all hover:scale-110",
                color === c ? "border-white/60 ring-1 ring-white/20" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 space-y-2.5">
        <button
          onClick={() => addChildNode(selectedNodeId!, "Novo node")}
          className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-dashed border-border hover:border-[#82B4C4]/40 hover:bg-[#82B4C4]/5 transition-all text-sm text-cream-dim"
        >
          <Plus size={16} className="text-[#82B4C4]" />
          Adicionar filho
        </button>

        {level > 0 && (
          <button
            onClick={() => removeNode(selectedNodeId!)}
            className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-red-500/40 hover:bg-red-500/5 transition-all text-sm text-muted hover:text-red-400"
          >
            <Trash2 size={16} />
            Remover node
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Chat Panel ─────────────────────────────────────────────────────────────

function ChatPanel() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { nodes, title, setMap } = useMapStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const mapContext = nodes.map((n) => `- ${n.data.label} (level ${n.data.level})`).join("\n");
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Mapa mental atual "${title}":\n${mapContext}\n\nPedido do usuario: ${userMessage}\n\nGere o mapa mental atualizado incorporando o pedido.`,
          mode: "refine",
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setMap(data.title, data.nodes, data.edges);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Mapa atualizado com ${data.nodes.length} nodes.` },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao processar. Tente novamente." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, nodes, title, setMap]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-elevated">
          <MessageSquare size={24} className="text-muted" />
        </div>
        <p className="text-sm text-muted text-center">Gere ou crie um mapa primeiro para refinar via chat</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-xs text-muted text-center py-8 space-y-1.5">
            <p className="font-medium text-sm text-cream-dim">Refine com IA</p>
            <p>Ex: &quot;Adicione mais detalhes em X&quot;</p>
            <p>ou &quot;Reorganize os branches&quot;</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2.5 text-sm", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-[#82B4C4]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={13} className="text-[#82B4C4]" />
              </div>
            )}
            <div
              className={cn(
                "px-3.5 py-2.5 rounded-lg max-w-[85%] text-sm",
                msg.role === "user" ? "bg-[#82B4C4]/15 text-primary" : "bg-elevated text-cream-dim"
              )}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-[#C4A882]/20 flex items-center justify-center shrink-0 mt-0.5">
                <User size={13} className="text-[#C4A882]" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-[#82B4C4]">
            <Loader2 size={14} className="animate-spin" />
            Processando...
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Refine seu mapa..."
            className="flex-1 bg-bg/50 border border-border rounded-lg px-3.5 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[#82B4C4]/50 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-lg bg-[#82B4C4]/20 text-[#82B4C4] hover:bg-[#82B4C4]/30 disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Export Panel ────────────────────────────────────────────────────────────

function ExportPanel() {
  const { title, nodes } = useMapStore();
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportTheme, setExportTheme] = useState<"dark" | "light">("dark");
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  const getViewportEl = () => document.querySelector(".react-flow__viewport") as HTMLElement | null;
  const getRfInstance = () => useMapStore.getState().reactFlowInstance;

  const bgColor = exportTheme === "dark" ? "#0A0A0A" : "#F5F2EE";

  /** Apply export theme temporarily, run fn, then restore. */
  const withExportTheme = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      const html = document.documentElement;
      const original = html.getAttribute("data-theme");
      if (exportTheme === "light") {
        html.setAttribute("data-theme", "light");
      } else {
        html.removeAttribute("data-theme");
      }
      await new Promise((r) => requestAnimationFrame(r));
      try {
        return await fn();
      } finally {
        if (original) html.setAttribute("data-theme", original);
        else html.removeAttribute("data-theme");
      }
    },
    [exportTheme]
  );

  /**
   * Render the FULL map content (not a viewport screenshot) via
   * getNodesBounds → getViewportForBounds → toPng on .react-flow__viewport.
   */
  const renderFullContent = useCallback(
    async (
      viewportEl: HTMLElement,
      rfInstance: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      opts: { width: number; height: number; pixelRatio: number; asSvg?: boolean }
    ) => {
      const internalNodes = rfInstance.getNodes();
      const nodesBounds = rfInstance.getNodesBounds(internalNodes);
      const vp = getViewportForBounds(
        nodesBounds,
        opts.width,
        opts.height,
        0.5,
        2,
        0.1
      );
      const styleOverride = {
        width: `${opts.width}px`,
        height: `${opts.height}px`,
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
      };
      const renderFn = opts.asSvg ? toSvg : toPng;
      return renderFn(viewportEl, {
        backgroundColor: bgColor,
        width: opts.width,
        height: opts.height,
        pixelRatio: opts.asSvg ? undefined : opts.pixelRatio,
        style: styleOverride,
      } as Parameters<typeof toPng>[1]);
    },
    [bgColor]
  );

  // ── PNG: Full-content render ──

  const handleExportPNG = useCallback(async () => {
    const viewportEl = getViewportEl();
    const rf = getRfInstance();
    if (!viewportEl || !rf) return;
    setExporting("png");
    try {
      const bounds = rf.getNodesBounds(rf.getNodes());
      const PAD = 100;
      const w = Math.ceil(bounds.width + PAD * 2);
      const h = Math.ceil(bounds.height + PAD * 2);

      const dataUrl = await withExportTheme(() =>
        renderFullContent(viewportEl, rf, { width: w, height: h, pixelRatio: 2 })
      );
      const link = document.createElement("a");
      link.download = `${title || "mapa-mental"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
    } finally {
      setExporting(null);
    }
  }, [title, withExportTheme, renderFullContent]);

  // ── SVG: Full-content render (vector) ──

  const handleExportSVG = useCallback(async () => {
    const viewportEl = getViewportEl();
    const rf = getRfInstance();
    if (!viewportEl || !rf) return;
    setExporting("svg");
    try {
      const bounds = rf.getNodesBounds(rf.getNodes());
      const PAD = 100;
      const w = Math.ceil(bounds.width + PAD * 2);
      const h = Math.ceil(bounds.height + PAD * 2);

      const dataUrl = await withExportTheme(() =>
        renderFullContent(viewportEl, rf, { width: w, height: h, pixelRatio: 1, asSvg: true })
      );
      const link = document.createElement("a");
      link.download = `${title || "mapa-mental"}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("SVG export failed:", err);
    } finally {
      setExporting(null);
    }
  }, [title, withExportTheme, renderFullContent]);

  // ── JSON ──

  const handleExportJSON = useCallback(() => {
    const store = useMapStore.getState();
    const data = { title: store.title, nodes: store.nodes, edges: store.edges, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `${title || "mapa-mental"}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }, [title]);

  // ── PDF: Overview + multi-page detail tiles at zoom 1:1 ──

  const handleExportPDF = useCallback(async () => {
    const viewportEl = getViewportEl();
    const rf = getRfInstance();
    if (!viewportEl || !rf) return;

    setExporting("pdf");
    setExportProgress("Calculando layout...");

    try {
      await withExportTheme(async () => {
        const internalNodes = rf.getNodes();
        const nodesBounds = rf.getNodesBounds(internalNodes);

        const PAD = 80;
        const contentX = nodesBounds.x - PAD;
        const contentY = nodesBounds.y - PAD;
        const contentW = nodesBounds.width + PAD * 2;
        const contentH = nodesBounds.height + PAD * 2;

        // A4 landscape proportions in content-pixels
        const PAGE_W = 1400;
        const PAGE_H = 990;

        const cols = Math.ceil(contentW / PAGE_W);
        const rows = Math.ceil(contentH / PAGE_H);
        const totalDetailPages = cols * rows;
        const totalPages = 1 + totalDetailPages;

        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: [PAGE_W, PAGE_H],
        });

        // ── Page 1: Overview (full map fitted to one page) ──
        setExportProgress("Gerando visão geral...");

        const overviewVP = getViewportForBounds(nodesBounds, PAGE_W, PAGE_H, 0.01, 1, 0.12);
        const overviewUrl = await toPng(viewportEl, {
          backgroundColor: bgColor,
          width: PAGE_W,
          height: PAGE_H,
          pixelRatio: 2,
          style: {
            width: `${PAGE_W}px`,
            height: `${PAGE_H}px`,
            transform: `translate(${overviewVP.x}px, ${overviewVP.y}px) scale(${overviewVP.zoom})`,
          },
        });
        pdf.addImage(overviewUrl, "PNG", 0, 0, PAGE_W, PAGE_H);

        const textColor = exportTheme === "dark" ? 180 : 60;
        const mutedColor = exportTheme === "dark" ? 90 : 150;
        pdf.setFontSize(12);
        pdf.setTextColor(textColor);
        pdf.text(title || "Mapa Mental", PAGE_W / 2, 28, { align: "center" });
        pdf.setFontSize(8);
        pdf.setTextColor(mutedColor);
        pdf.text(
          `Visão geral · ${totalDetailPages} página${totalDetailPages > 1 ? "s" : ""} detalhada${totalDetailPages > 1 ? "s" : ""} a seguir`,
          PAGE_W / 2, 42, { align: "center" }
        );

        // ── Pages 2+: Detail tiles rendered at zoom 1:1 ──
        let pageNum = 1;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            pageNum++;
            setExportProgress(`Gerando página ${pageNum}/${totalPages}...`);

            pdf.addPage([PAGE_W, PAGE_H], "landscape");

            const offsetX = contentX + col * PAGE_W;
            const offsetY = contentY + row * PAGE_H;

            const tileUrl = await toPng(viewportEl, {
              backgroundColor: bgColor,
              width: PAGE_W,
              height: PAGE_H,
              pixelRatio: 2,
              style: {
                width: `${PAGE_W}px`,
                height: `${PAGE_H}px`,
                transform: `translate(${-offsetX}px, ${-offsetY}px) scale(1)`,
              },
            });
            pdf.addImage(tileUrl, "PNG", 0, 0, PAGE_W, PAGE_H);

            pdf.setFontSize(7);
            pdf.setTextColor(mutedColor);
            pdf.text(
              `${title || "Mapa Mental"} — Página ${pageNum}/${totalPages}`,
              PAGE_W / 2, PAGE_H - 12, { align: "center" }
            );
          }
        }

        pdf.save(`${title || "mapa-mental"}.pdf`);
      });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(null);
      setExportProgress(null);
    }
  }, [title, bgColor, withExportTheme, exportTheme]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-elevated">
          <Download size={24} className="text-muted" />
        </div>
        <p className="text-sm text-muted text-center">Crie um mapa primeiro para exportar</p>
      </div>
    );
  }

  const formats = [
    { id: "png", label: "PNG", desc: "Conteúdo completo, alta resolução", icon: Image, action: handleExportPNG },
    { id: "svg", label: "SVG", desc: "Vetorial, escalável infinitamente", icon: Code, action: handleExportSVG },
    { id: "pdf", label: "PDF", desc: "Multi-página, legível ao ampliar", icon: FileDown, action: handleExportPDF },
    { id: "json", label: "JSON", desc: "Dados importáveis", icon: FileText, action: handleExportJSON },
  ];

  return (
    <div className="p-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
        Exportar mapa
      </h3>

      {/* Theme toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg/30 mb-1">
        <span className="text-xs text-muted">Tema da exportação</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setExportTheme("dark")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
              exportTheme === "dark"
                ? "bg-[#82B4C4]/20 text-[#82B4C4]"
                : "text-muted hover:text-primary"
            )}
          >
            <Moon size={12} />
            Escuro
          </button>
          <button
            onClick={() => setExportTheme("light")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
              exportTheme === "light"
                ? "bg-[#82B4C4]/20 text-[#82B4C4]"
                : "text-muted hover:text-primary"
            )}
          >
            <Sun size={12} />
            Claro
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      {exportProgress && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#82B4C4]/10 text-xs text-[#82B4C4]">
          <Loader2 size={12} className="animate-spin shrink-0" />
          {exportProgress}
        </div>
      )}

      {formats.map((f) => (
        <button
          key={f.id}
          onClick={f.action}
          disabled={!!exporting}
          className="w-full flex items-center gap-3.5 p-3.5 rounded-lg border border-border hover:border-[#82B4C4]/30 bg-bg/30 transition-all text-left disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#82B4C4]/10 shrink-0">
            {exporting === f.id ? (
              <Loader2 size={16} className="text-[#82B4C4] animate-spin" />
            ) : (
              <f.icon size={16} className="text-[#82B4C4]" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-primary">{f.label}</div>
            <div className="text-xs text-muted">{f.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

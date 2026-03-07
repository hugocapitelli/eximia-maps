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
} from "lucide-react";
import { useMapStore } from "@/stores/map-store";
import { NODE_COLORS } from "@/lib/types/mind-map";
import { cn } from "@/lib/utils/cn";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";

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

  const getFlowElement = () => document.querySelector(".react-flow") as HTMLElement | null;

  const handleExportPNG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    setExporting("png");
    try {
      const dataUrl = await toPng(el, { backgroundColor: "#0A0A0A", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${title || "mapa-mental"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(null);
    }
  }, [title]);

  const handleExportSVG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    setExporting("svg");
    try {
      const dataUrl = await toSvg(el, { backgroundColor: "#0A0A0A" });
      const link = document.createElement("a");
      link.download = `${title || "mapa-mental"}.svg`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(null);
    }
  }, [title]);

  const handleExportJSON = useCallback(() => {
    const store = useMapStore.getState();
    const data = { title: store.title, nodes: store.nodes, edges: store.edges, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `${title || "mapa-mental"}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }, [title]);

  const handleExportPDF = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    setExporting("pdf");
    try {
      const dataUrl = await toPng(el, { backgroundColor: "#0A0A0A", pixelRatio: 2 });
      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      const pdf = new jsPDF({
        orientation: img.width > img.height ? "landscape" : "portrait",
        unit: "px",
        format: [img.width / 2, img.height / 2],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, img.width / 2, img.height / 2);
      pdf.save(`${title || "mapa-mental"}.pdf`);
    } finally {
      setExporting(null);
    }
  }, [title]);

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
    { id: "png", label: "PNG", desc: "Imagem alta resolucao (2x)", icon: Image, action: handleExportPNG },
    { id: "svg", label: "SVG", desc: "Vetorial, escalavel", icon: Code, action: handleExportSVG },
    { id: "pdf", label: "PDF", desc: "Documento para impressao", icon: FileDown, action: handleExportPDF },
    { id: "json", label: "JSON", desc: "Dados importaveis", icon: FileText, action: handleExportJSON },
  ];

  return (
    <div className="p-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
        Exportar mapa
      </h3>
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

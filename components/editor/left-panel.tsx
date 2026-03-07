"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Network,
  CircleDot,
  GitBranch,
  Layers,
  Leaf,
  ClipboardPaste,
  AlertCircle,
  Upload,
  LayoutTemplate,
  Search,
  BookmarkPlus,
  Briefcase,
  GraduationCap,
  Palette,
  Target,
  User,
  X,
} from "lucide-react";
import { useMapStore } from "@/stores/map-store";
import { cn } from "@/lib/utils/cn";
import { NODE_COLORS } from "@/lib/types/mind-map";
import type { MindMapNode, MindMapEdge } from "@/lib/types/mind-map";

// ─── Constants ──────────────────────────────────────────────────────────────

const STYLES = [
  { id: "default", label: "Equilibrado", desc: "Informativo e organizado" },
  { id: "academic", label: "Acadêmico", desc: "Técnico com conceitos" },
  { id: "business", label: "Executivo", desc: "Estratégia e KPIs" },
  { id: "creative", label: "Criativo", desc: "Analogias e conexões" },
] as const;

const TEMPLATES = [
  { label: "Tema livre", prompt: "" },
  { label: "Análise SWOT", prompt: "Análise SWOT de " },
  { label: "Plano de Projeto", prompt: "Plano de projeto para " },
  { label: "Estudo de Caso", prompt: "Estudo de caso sobre " },
  { label: "Brainstorm", prompt: "Brainstorm de ideias para " },
  { label: "Resumo de Livro", prompt: "Resumo estruturado do livro " },
  { label: "EAP", prompt: "Estrutura analítica de projeto (EAP) para " },
];

const NODE_TYPES = [
  { type: "root", label: "Raiz", icon: CircleDot, level: 0, desc: "Node central" },
  { type: "branch", label: "Branch", icon: GitBranch, level: 1, desc: "Ramo principal" },
  { type: "sub", label: "Sub-item", icon: Layers, level: 2, desc: "Sub-ramificação" },
  { type: "leaf", label: "Folha", icon: Leaf, level: 3, desc: "Detalhe final" },
];

type AIMode = "generate" | "import" | "json";

let manualNodeId = 5000;

// ─── Component ──────────────────────────────────────────────────────────────

export function LeftPanel() {
  const [aiExpanded, setAiExpanded] = useState(true);
  const [manualExpanded, setManualExpanded] = useState(true);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>("generate");

  // Generate state
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>("default");
  const [showStyles, setShowStyles] = useState(false);

  // Import state
  const [importText, setImportText] = useState("");

  const [error, setError] = useState<string | null>(null);

  const { nodes, selectedNodeId, isGenerating, setGenerating, setMap, addNode } = useMapStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // ─── AI Generate ────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), style, mode: "generate" }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Falha na geração");
      }
      const data = await response.json();
      setMap(data.title, data.nodes, data.edges);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar mapa");
    } finally {
      setGenerating(false);
    }
  }, [prompt, style, isGenerating, setGenerating, setMap]);

  // ─── AI Import ──────────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!importText.trim() || isGenerating) return;
    setError(null);
    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: importText.trim(), mode: "import" }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Falha na importação");
      }
      const data = await response.json();
      setMap(data.title, data.nodes, data.edges);
      setImportText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar");
    } finally {
      setGenerating(false);
    }
  }, [importText, isGenerating, setGenerating, setMap]);

  // ─── Manual Nodes ───────────────────────────────────────────────────────

  const handleAddManualNode = useCallback(
    (level: number) => {
      const id = `node-${++manualNodeId}`;
      const hasRoot = nodes.some((n) => (n.data.level as number) === 0);

      if (level === 0 && hasRoot) return;

      if (selectedNodeId && level > 0) {
        useMapStore.getState().addChildNode(selectedNodeId, "Novo node");
        return;
      }

      const color = level === 0 ? NODE_COLORS[0] : NODE_COLORS[level % NODE_COLORS.length];
      const existingCount = nodes.length;

      const node: MindMapNode = {
        id,
        type: "mindmap",
        position: {
          x: level === 0 ? 400 : 200 + level * 250,
          y: level === 0 ? 300 : 100 + existingCount * 80,
        },
        data: { label: level === 0 ? "Tema Central" : "Novo node", color, level },
      };

      const root = nodes.find((n) => (n.data.level as number) === 0);
      if (level > 0 && root) {
        const edge: MindMapEdge = {
          id: `edge-${root.id}-${id}`,
          source: root.id,
          target: id,
          type: "mindmap",
          style: { stroke: color },
        };
        addNode(node, edge);
      } else {
        useMapStore.getState().setNodes([...nodes, node]);
      }

      useMapStore.getState().selectNode(id);
    },
    [nodes, selectedNodeId, addNode]
  );

  const hasRoot = nodes.some((n) => (n.data.level as number) === 0);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <aside className="w-[320px] bg-surface/50 border-r border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          Ferramentas
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── AI Section ─────────────────────────────────────────────── */}
        <div className="border-b border-border">
          <button
            onClick={() => setAiExpanded(!aiExpanded)}
            className="flex items-center gap-2 w-full px-4 py-3 hover:bg-elevated/50 transition-colors"
          >
            <ChevronRight
              size={12}
              className={cn("text-muted transition-transform", aiExpanded && "rotate-90")}
            />
            <Sparkles size={12} className="text-[#82B4C4]" />
            <span className="text-sm font-semibold text-primary">Inteligência Artificial</span>
            <span className="ml-auto text-[9px] text-muted/50 bg-[#82B4C4]/10 px-1.5 py-0.5 rounded">
              AI
            </span>
          </button>

          {aiExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {/* Mode tabs */}
              <div className="flex bg-elevated p-0.5 rounded-lg">
                <button
                  onClick={() => { setAiMode("generate"); setError(null); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                    aiMode === "generate"
                      ? "bg-surface text-[#82B4C4] shadow-sm"
                      : "text-muted hover:text-primary"
                  )}
                >
                  <Sparkles size={10} />
                  Gerar
                </button>
                <button
                  onClick={() => { setAiMode("import"); setError(null); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                    aiMode === "import"
                      ? "bg-surface text-[#82B4C4] shadow-sm"
                      : "text-muted hover:text-primary"
                  )}
                >
                  <ClipboardPaste size={10} />
                  Importar
                </button>
                <button
                  onClick={() => { setAiMode("json"); setError(null); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                    aiMode === "json"
                      ? "bg-surface text-[#82B4C4] shadow-sm"
                      : "text-muted hover:text-primary"
                  )}
                >
                  <Upload size={10} />
                  JSON
                </button>
              </div>

              {/* ── Generate Mode ──────────────────────────────────── */}
              {aiMode === "generate" && (
                <>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      placeholder="Descreva o tema do mapa..."
                      className={cn(
                        "w-full bg-bg/50 border border-border rounded-lg px-3 py-2 pr-10",
                        "text-xs text-primary placeholder:text-muted",
                        "focus:outline-none focus:border-[#82B4C4]/50 focus:ring-1 focus:ring-[#82B4C4]/20",
                        "resize-none min-h-[80px]"
                      )}
                      disabled={isGenerating}
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || isGenerating}
                      className={cn(
                        "absolute bottom-2 right-2 p-1.5 rounded-md transition-all",
                        "disabled:opacity-30",
                        prompt.trim() && !isGenerating
                          ? "bg-[#82B4C4]/20 text-[#82B4C4] hover:bg-[#82B4C4]/30"
                          : "text-muted"
                      )}
                    >
                      {isGenerating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                    </button>
                  </div>

                  {/* Style */}
                  <button
                    onClick={() => setShowStyles(!showStyles)}
                    className="flex items-center gap-1.5 text-xs text-cream-dim hover:text-primary transition-colors"
                  >
                    <span>Estilo: {STYLES.find((s) => s.id === style)?.label}</span>
                    <ChevronDown
                      size={10}
                      className={cn("transition-transform", showStyles && "rotate-180")}
                    />
                  </button>

                  {showStyles && (
                    <div className="grid grid-cols-2 gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setStyle(s.id); setShowStyles(false); }}
                          className={cn(
                            "p-2 rounded-md border text-left transition-all",
                            style === s.id
                              ? "border-[#82B4C4]/40 bg-[#82B4C4]/10 text-[#82B4C4]"
                              : "border-border hover:border-border-light text-cream-dim"
                          )}
                        >
                          <div className="text-xs font-medium">{s.label}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Templates */}
                  <div className="flex flex-wrap gap-1">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => setPrompt(t.prompt)}
                        className="px-2.5 py-1 rounded-md bg-elevated border border-border text-[11px] text-cream-dim hover:border-[#82B4C4]/30 hover:text-[#82B4C4] transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* ── Import Mode ────────────────────────────────────── */}
              {aiMode === "import" && (
                <>
                  <div className="rounded-lg border border-[#82B4C4]/20 bg-[#82B4C4]/5 px-3 py-2.5 text-[11px] text-[#82B4C4]/80 leading-relaxed">
                    Cole um fluxograma, outline, lista hierárquica, markdown ou qualquer texto estruturado. A IA converte em mapa mental preservando toda a hierarquia.
                  </div>

                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={"Cole aqui seu conteúdo...\n\nExemplos:\n- Fluxograma ASCII (┌─ ├─ └─)\n- Markdown (# ## ###)\n- Listas com indentação\n- Outlines numerados"}
                    className={cn(
                      "w-full bg-bg/50 border border-border rounded-lg px-3 py-2",
                      "text-xs text-primary placeholder:text-muted/60",
                      "focus:outline-none focus:border-[#82B4C4]/50 focus:ring-1 focus:ring-[#82B4C4]/20",
                      "resize-none min-h-[200px] font-mono"
                    )}
                    disabled={isGenerating}
                  />

                  {importText.trim() && (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{importText.split("\n").filter((l) => l.trim()).length} linhas detectadas</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {nodes.length > 0 && (
                      <button
                        onClick={handleImport}
                        disabled={!importText.trim() || isGenerating}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all",
                          "border border-[#82B4C4]/30 text-[#82B4C4] hover:bg-[#82B4C4]/10",
                          "disabled:opacity-40 disabled:pointer-events-none"
                        )}
                      >
                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <ClipboardPaste size={14} />}
                        Substituir mapa
                      </button>
                    )}
                    <button
                      onClick={handleImport}
                      disabled={!importText.trim() || isGenerating}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all",
                        "bg-[#82B4C4] text-bg hover:bg-[#9AC8D6]",
                        "disabled:opacity-40 disabled:pointer-events-none"
                      )}
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {nodes.length > 0 ? "Converter" : "Converter em mapa"}
                    </button>
                  </div>
                </>
              )}

              {/* ── JSON Import Mode ──────────────────────────────── */}
              {aiMode === "json" && (
                <>
                  <div className="rounded-lg border border-[#82B4C4]/20 bg-[#82B4C4]/5 px-3 py-2.5 text-[11px] text-[#82B4C4]/80 leading-relaxed">
                    Importe um arquivo JSON exportado anteriormente pelo eximIA Maps.
                  </div>

                  <label
                    className={cn(
                      "flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed transition-all cursor-pointer",
                      "border-border hover:border-[#82B4C4]/40 hover:bg-[#82B4C4]/5"
                    )}
                  >
                    <Upload size={24} className="text-muted" />
                    <span className="text-xs text-cream-dim font-medium">Clique para selecionar arquivo</span>
                    <span className="text-[10px] text-muted">.json</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            const data = JSON.parse(ev.target?.result as string);
                            if (data.nodes && data.edges) {
                              setMap(data.title || "Mapa importado", data.nodes, data.edges);
                              setError(null);
                            } else {
                              setError("Arquivo JSON inválido. Deve conter nodes e edges.");
                            }
                          } catch {
                            setError("Erro ao ler o arquivo JSON.");
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-400">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Manual Nodes Section ───────────────────────────────────── */}
        <div className="border-b border-border">
          <button
            onClick={() => setManualExpanded(!manualExpanded)}
            className="flex items-center gap-2 w-full px-4 py-3 hover:bg-elevated/50 transition-colors"
          >
            <ChevronRight
              size={12}
              className={cn("text-muted transition-transform", manualExpanded && "rotate-90")}
            />
            <Network size={12} className="text-[#C4A882]" />
            <span className="text-sm font-semibold text-primary">Nodes Manuais</span>
            <span className="ml-auto text-[9px] text-muted/50">{nodes.length}</span>
          </button>

          {manualExpanded && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {NODE_TYPES.map((nt) => {
                  const disabled = nt.level === 0 && hasRoot;
                  const isAddToSelected =
                    nt.level > 0 &&
                    selectedNode &&
                    (selectedNode.data.level as number) < nt.level;

                  return (
                    <button
                      key={nt.type}
                      onClick={() => handleAddManualNode(nt.level)}
                      disabled={disabled}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                        "hover:border-[#C4A882]/30 hover:bg-[#C4A882]/5 hover:shadow-sm",
                        "active:scale-[0.97]",
                        disabled
                          ? "opacity-30 cursor-not-allowed border-border"
                          : "border-border cursor-pointer"
                      )}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-elevated">
                        <nt.icon size={16} className="text-cream-dim" />
                      </div>
                      <span className="text-xs text-cream-dim font-medium">{nt.label}</span>
                      {isAddToSelected && (
                        <span className="text-[10px] text-[#82B4C4]">+ ao selecionado</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Add Child */}
              {selectedNode && (
                <button
                  onClick={() =>
                    useMapStore.getState().addChildNode(selectedNodeId!, "Novo node")
                  }
                  className="mt-2.5 w-full flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:border-[#82B4C4]/40 hover:bg-[#82B4C4]/5 transition-all"
                >
                  <Plus size={14} className="text-[#82B4C4]" />
                  <span className="text-xs text-cream-dim">
                    Filho de &quot;{(selectedNode.data.label as string).slice(0, 20)}&quot;
                  </span>
                </button>
              )}

              {nodes.length === 0 && (
                <p className="mt-2.5 text-xs text-muted text-center">
                  Comece adicionando um node Raiz ou gere com IA
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Templates Section ────────────────────────────────────── */}
        <div className="border-b border-border">
          <button
            onClick={() => setTemplatesExpanded(!templatesExpanded)}
            className="flex items-center gap-2 w-full px-4 py-3 hover:bg-elevated/50 transition-colors"
          >
            <ChevronRight
              size={12}
              className={cn("text-muted transition-transform", templatesExpanded && "rotate-90")}
            />
            <LayoutTemplate size={12} className="text-[#8B9CC4]" />
            <span className="text-sm font-semibold text-primary">Templates</span>
          </button>

          {templatesExpanded && (
            <TemplatesGrid />
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Templates Grid (Marketplace) ───────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: typeof Briefcase }> = {
  all: { label: "Todos", color: "#82B4C4", icon: LayoutTemplate },
  business: { label: "Negócios", color: "#C4A882", icon: Briefcase },
  academic: { label: "Acadêmico", color: "#82B4C4", icon: GraduationCap },
  creative: { label: "Criativo", color: "#C48BB4", icon: Palette },
  productivity: { label: "Produtividade", color: "#7C9E8F", icon: Target },
  custom: { label: "Meus Templates", color: "#8B9CC4", icon: User },
};

function TemplatesGrid() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [saving, setSaving] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveCategory, setSaveCategory] = useState("business");
  const [saveError, setSaveError] = useState<string | null>(null);
  const { nodes, edges, title, setMap } = useMapStore();

  const loadTemplates = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = category === "all" || t.category === category || (category === "custom" && !t.is_public);
    const matchesSearch = !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSaveAsTemplate = async () => {
    if (!saveName.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          description: saveDesc.trim(),
          category: saveCategory,
          data: { nodes, edges, title },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao salvar template");
      }
      setShowSaveForm(false);
      setSaveName("");
      setSaveDesc("");
      loadTemplates();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // Determine if user has custom templates
  const hasUserTemplates = templates.some((t) => !t.is_public);

  const categoryKeys = ["all", "business", "academic", "creative", "productivity"];
  if (hasUserTemplates) categoryKeys.push("custom");

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar templates..."
          className={cn(
            "w-full bg-bg/50 border border-border rounded-lg pl-7 pr-7 py-2",
            "text-xs text-primary placeholder:text-muted",
            "focus:outline-none focus:border-[#8B9CC4]/50 focus:ring-1 focus:ring-[#8B9CC4]/20"
          )}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        {categoryKeys.map((key) => {
          const config = CATEGORY_CONFIG[key];
          if (!config) return null;
          const isActive = category === key;
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all border",
                isActive
                  ? "border-transparent text-bg"
                  : "border-border text-cream-dim hover:border-border-light"
              )}
              style={isActive ? { backgroundColor: config.color } : undefined}
            >
              <config.icon size={10} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-muted" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-xs text-muted text-center py-4">
          {search ? "Nenhum template encontrado" : "Nenhum template nesta categoria"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-0.5">
          {filteredTemplates.map((t) => {
            const catConfig = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.business;
            const isUserTemplate = !t.is_public;
            const CatIcon = catConfig.icon;
            return (
              <button
                key={t.id}
                onClick={() => setMap(t.name, t.data.nodes, t.data.edges)}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-[#8B9CC4]/30 hover:bg-[#8B9CC4]/5 transition-all text-left group"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md shrink-0"
                  style={{ backgroundColor: `${catConfig.color}15` }}
                >
                  <CatIcon size={14} style={{ color: catConfig.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-primary truncate">{t.name}</span>
                    {isUserTemplate && (
                      <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-[#8B9CC4]/15 text-[#8B9CC4]">
                        Meu
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <div className="text-[10px] text-muted mt-0.5 line-clamp-2">{t.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: `${catConfig.color}15`,
                        color: catConfig.color,
                      }}
                    >
                      {catConfig.label}
                    </span>
                    <span className="text-[10px] text-muted/60">{t.node_count || t.data?.nodes?.length || 0} nodes</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Save as Template */}
      {nodes.length > 0 && !showSaveForm && (
        <button
          onClick={() => {
            setSaveName(title || "");
            setShowSaveForm(true);
          }}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all",
            "border border-dashed border-[#8B9CC4]/40 text-[#8B9CC4] hover:bg-[#8B9CC4]/10 hover:border-[#8B9CC4]/60"
          )}
        >
          <BookmarkPlus size={14} />
          Salvar como template
        </button>
      )}

      {/* Save Form */}
      {showSaveForm && (
        <div className="space-y-2 rounded-lg border border-[#8B9CC4]/30 bg-[#8B9CC4]/5 p-3">
          <div className="text-xs font-semibold text-primary">Salvar como template</div>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Nome do template"
            className={cn(
              "w-full bg-bg/50 border border-border rounded-md px-2.5 py-1.5",
              "text-xs text-primary placeholder:text-muted",
              "focus:outline-none focus:border-[#8B9CC4]/50"
            )}
          />
          <input
            value={saveDesc}
            onChange={(e) => setSaveDesc(e.target.value)}
            placeholder="Descricao (opcional)"
            className={cn(
              "w-full bg-bg/50 border border-border rounded-md px-2.5 py-1.5",
              "text-xs text-primary placeholder:text-muted",
              "focus:outline-none focus:border-[#8B9CC4]/50"
            )}
          />
          <div className="flex flex-wrap gap-1">
            {["business", "academic", "creative", "productivity"].map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              if (!config) return null;
              const isActive = saveCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSaveCategory(cat)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium transition-all border",
                    isActive
                      ? "border-transparent text-bg"
                      : "border-border text-cream-dim"
                  )}
                  style={isActive ? { backgroundColor: config.color } : undefined}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
          {saveError && (
            <div className="text-[11px] text-red-400">{saveError}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowSaveForm(false); setSaveError(null); }}
              className="flex-1 py-1.5 rounded-md text-xs text-cream-dim border border-border hover:bg-elevated transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAsTemplate}
              disabled={!saveName.trim() || saving}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
                "bg-[#8B9CC4] text-bg hover:bg-[#9DADD5]",
                "disabled:opacity-40 disabled:pointer-events-none"
              )}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <BookmarkPlus size={12} />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

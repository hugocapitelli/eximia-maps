"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";
import { useMapStore } from "@/stores/map-store";
import { cn } from "@/lib/utils/cn";

const STYLES = [
  { id: "default", label: "Equilibrado", desc: "Informativo e organizado" },
  { id: "academic", label: "Academico", desc: "Tecnico com conceitos" },
  { id: "business", label: "Executivo", desc: "Estrategia e KPIs" },
  { id: "creative", label: "Criativo", desc: "Analogias e conexoes" },
] as const;

const TEMPLATES = [
  { label: "Tema livre", prompt: "" },
  { label: "Analise SWOT", prompt: "Analise SWOT de " },
  { label: "Plano de Projeto", prompt: "Plano de projeto para " },
  { label: "Estudo de Caso", prompt: "Estudo de caso sobre " },
  { label: "Brainstorm", prompt: "Brainstorm de ideias para " },
  { label: "Resumo de Livro", prompt: "Resumo estruturado do livro " },
  { label: "EAP", prompt: "Estrutura analitica de projeto (EAP) para " },
];

export function GeneratePanel() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>("default");
  const [showStyles, setShowStyles] = useState(false);
  const { isGenerating, setGenerating, setMap } = useMapStore();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), style }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      setMap(data.title, data.nodes, data.edges);
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setGenerating(false);
    }
  }, [prompt, style, isGenerating, setGenerating, setMap]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate]
  );

  const applyTemplate = useCallback((templatePrompt: string) => {
    setPrompt(templatePrompt);
  }, []);

  return (
    <div className="glass-panel p-4 animate-fade-in">
      {/* Prompt Input */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Descreva o tema do seu mapa mental..."
          className={cn(
            "w-full bg-bg/50 border border-border rounded-xl px-4 py-3 pr-12",
            "text-sm text-primary placeholder:text-muted",
            "focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20",
            "resize-none transition-all",
            "min-h-[80px]"
          )}
          disabled={isGenerating}
        />
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className={cn(
            "absolute bottom-3 right-3 p-2 rounded-lg transition-all",
            "disabled:opacity-30 disabled:cursor-not-allowed",
            prompt.trim() && !isGenerating
              ? "bg-teal/20 text-teal hover:bg-teal/30"
              : "text-muted"
          )}
        >
          {isGenerating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Sparkles size={18} />
          )}
        </button>
      </div>

      {/* Style selector */}
      <div className="mt-3">
        <button
          onClick={() => setShowStyles(!showStyles)}
          className="flex items-center gap-2 text-xs text-cream-dim hover:text-primary transition-colors"
        >
          <span>Estilo: {STYLES.find((s) => s.id === style)?.label}</span>
          <ChevronDown
            size={12}
            className={cn("transition-transform", showStyles && "rotate-180")}
          />
        </button>

        {showStyles && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStyle(s.id);
                  setShowStyles(false);
                }}
                className={cn(
                  "p-2 rounded-lg border text-left transition-all text-xs",
                  style === s.id
                    ? "border-teal/40 bg-teal/10 text-teal"
                    : "border-border hover:border-border-light text-cream-dim"
                )}
              >
                <div className="font-medium">{s.label}</div>
                <div className="text-[10px] text-muted mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick templates */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            onClick={() => applyTemplate(t.prompt)}
            className="px-2.5 py-1 rounded-md bg-elevated border border-border text-[11px] text-cream-dim hover:border-teal/30 hover:text-teal transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

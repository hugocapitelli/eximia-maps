"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Input, Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  Search,
  LayoutTemplate,
  Briefcase,
  GraduationCap,
  Palette,
  Target,
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  Users,
  User,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  data: { nodes: any[]; edges: any[] };
  node_count: number;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

type Category = "all" | "business" | "academic" | "creative" | "productivity" | "mine";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; icon: typeof Briefcase; color: string }[] = [
  { id: "all", label: "Todos", icon: LayoutTemplate, color: "#82B4C4" },
  { id: "business", label: "Negócios", icon: Briefcase, color: "#C4A882" },
  { id: "academic", label: "Acadêmico", icon: GraduationCap, color: "#82B4C4" },
  { id: "creative", label: "Criativo", icon: Palette, color: "#C48BB4" },
  { id: "productivity", label: "Produtividade", icon: Target, color: "#7C9E8F" },
  { id: "mine", label: "Meus Templates", icon: User, color: "#8B9CC4" },
];

function getCategoryMeta(cat: string) {
  return CATEGORIES.find((c) => c.id === cat) || CATEGORIES[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [creating, setCreating] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/templates");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTemplates(data);
      }
    } catch {
      toast.error("Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filter
  const filtered = templates.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      activeCategory === "all" ||
      (activeCategory === "mine" ? !t.is_public : t.category === activeCategory);

    return matchesSearch && matchesCategory;
  });

  // Stats
  const publicCount = templates.filter((t) => t.is_public).length;
  const myCount = templates.filter((t) => !t.is_public).length;
  const categoryCount = (cat: string) =>
    templates.filter((t) => t.category === cat && t.is_public).length;

  // Use template: create new map from template
  async function handleUseTemplate(template: Template) {
    setCreating(template.id);
    try {
      const res = await fetch("/api/v1/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template.name,
          description: template.description,
          data: template.data,
          node_count: template.node_count,
        }),
      });
      if (res.ok) {
        const map = await res.json();
        router.push(`/admin/maps/${map.id}/edit`);
      } else {
        toast.error("Erro ao criar mapa");
      }
    } catch {
      toast.error("Erro ao criar mapa");
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#82B4C4]/5 via-surface to-[#C48BB4]/5 p-8 mb-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#82B4C4]/15">
              <LayoutTemplate size={20} className="text-[#82B4C4]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Templates</h1>
              <p className="text-sm text-muted">
                Comece rapidamente com modelos prontos para qualquer contexto
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-[#C4A882]" />
              <span className="text-sm text-cream-dim">
                <span className="font-semibold text-primary">{publicCount}</span> templates
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[#7C9E8F]" />
              <span className="text-sm text-cream-dim">
                <span className="font-semibold text-primary">4</span> categorias
              </span>
            </div>
            {myCount > 0 && (
              <div className="flex items-center gap-2">
                <User size={14} className="text-[#8B9CC4]" />
                <span className="text-sm text-cream-dim">
                  <span className="font-semibold text-primary">{myCount}</span> seus
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Background decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03]">
          <LayoutTemplate size={256} />
        </div>
      </div>

      {/* Search + Categories */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar templates..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count =
            cat.id === "all"
              ? templates.length
              : cat.id === "mine"
                ? myCount
                : categoryCount(cat.id);

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                isActive
                  ? "text-white shadow-lg"
                  : "border-border text-muted hover:text-primary hover:border-border-light bg-surface"
              )}
              style={
                isActive
                  ? {
                      backgroundColor: cat.color,
                      borderColor: cat.color,
                      boxShadow: `0 4px 14px ${cat.color}30`,
                    }
                  : undefined
              }
            >
              <cat.icon size={14} />
              {cat.label}
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-white/20" : "bg-elevated"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick action: Create with AI */}
      {!search && activeCategory === "all" && (
        <div className="mb-8">
          <Card
            className="group relative overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-[#82B4C4]/5 transition-all border-[#82B4C4]/20 hover:border-[#82B4C4]/40"
            onClick={() => router.push("/admin/maps/new")}
          >
            <div className="flex items-center gap-6 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#82B4C4]/20 to-[#C48BB4]/20 shrink-0">
                <Sparkles size={24} className="text-[#82B4C4]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary group-hover:text-[#82B4C4] transition-colors">
                  Criar com Inteligência Artificial
                </h3>
                <p className="text-sm text-muted mt-0.5">
                  Descreva o tema e a IA gera um mapa mental completo em segundos
                </p>
              </div>
              <ArrowRight size={20} className="text-muted group-hover:text-[#82B4C4] group-hover:translate-x-1 transition-all" />
            </div>
          </Card>
        </div>
      )}

      {/* Templates grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-52 rounded-xl border border-border bg-surface animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutTemplate size={48} className="text-muted mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {search ? "Nenhum template encontrado" : "Nenhum template nesta categoria"}
          </h3>
          <p className="text-sm text-muted max-w-md">
            {search
              ? "Tente outro termo de busca"
              : "Templates novos são adicionados regularmente. Volte em breve!"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const catMeta = getCategoryMeta(template.category);
            const isCreating = creating === template.id;

            return (
              <Card
                key={template.id}
                className="group relative overflow-hidden hover:border-[#82B4C4]/30 transition-all hover:shadow-lg hover:shadow-[#82B4C4]/5"
              >
                {/* Category color bar */}
                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: catMeta.color }}
                />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${catMeta.color}15` }}
                    >
                      <catMeta.icon size={18} style={{ color: catMeta.color }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!template.is_public && (
                        <Badge className="bg-[#8B9CC4]/10 text-[#8B9CC4]">Meu</Badge>
                      )}
                      <Badge
                        className="text-[10px]"
                        style={{
                          backgroundColor: `${catMeta.color}15`,
                          color: catMeta.color,
                        }}
                      >
                        {catMeta.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold text-sm text-primary mb-1.5 group-hover:text-[#82B4C4] transition-colors">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-4">
                      {template.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <TrendingUp size={11} />
                        {template.node_count} nodes
                      </span>
                    </div>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      disabled={isCreating}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        "bg-[#82B4C4]/10 text-[#82B4C4] hover:bg-[#82B4C4] hover:text-bg",
                        "disabled:opacity-50"
                      )}
                    >
                      {isCreating ? (
                        <>
                          <Clock size={12} className="animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          Usar template
                          <ArrowRight size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

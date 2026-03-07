import Link from "next/link";
import Image from "next/image";
import { Sparkles, Map, Brain, Download, ArrowRight, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#82B4C4]/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C4A882]/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#82B4C4]/[0.02] blur-3xl" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-horizontal.svg"
            alt="eximIA"
            width={100}
            height={22}
          />
          <div className="h-5 w-px bg-border-light" />
          <span className="text-[11px] font-black tracking-[0.15em] text-[#82B4C4]">MAPS</span>
        </div>
        <Link
          href="/admin/login"
          className="text-sm text-cream-dim hover:text-primary transition-colors"
        >
          Entrar
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#82B4C4]/10 border border-[#82B4C4]/20 text-xs text-[#82B4C4] font-medium mb-8">
          <Sparkles size={12} />
          Powered by AI
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-5 leading-tight">
          Mapas mentais com
          <br />
          <span className="text-[#82B4C4]">inteligência artificial</span>
        </h1>

        <p className="text-base text-cream-dim max-w-xl mb-10 leading-relaxed">
          Descreva um tema e a IA cria um mapa mental completo e interativo em segundos.
          Refine via chat, arraste nodes e exporte em PNG, PDF ou SVG.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#82B4C4] text-bg font-semibold text-sm hover:bg-[#9AC8D6] transition-colors"
          >
            Começar agora
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-primary text-sm hover:bg-elevated transition-colors"
          >
            Fazer login
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Sparkles,
              label: "Geração por IA",
              desc: "Digite um tema e receba um mapa mental completo com branches, sub-items e hierarquia.",
              color: "#82B4C4",
            },
            {
              icon: Brain,
              label: "Chat para refinar",
              desc: "Converse com a IA para adicionar, remover ou reorganizar branches do seu mapa.",
              color: "#C4A882",
            },
            {
              icon: Map,
              label: "Canvas interativo",
              desc: "Zoom, pan, drag & drop. Edite labels com duplo-clique. React Flow sob o capô.",
              color: "#7C9E8F",
            },
            {
              icon: Download,
              label: "Export multi-formato",
              desc: "Exporte em PNG (2x retina), SVG vetorial ou JSON para importar depois.",
              color: "#8B9CC4",
            },
            {
              icon: Zap,
              label: "4 estilos de mapa",
              desc: "Equilibrado, acadêmico, executivo ou criativo. Cada estilo gera mapas com personalidade diferente.",
              color: "#C48BB4",
            },
            {
              icon: Shield,
              label: "Salve e organize",
              desc: "Seus mapas ficam salvos na nuvem. Acesse de qualquer lugar, duplique e compartilhe.",
              color: "#8BC4A8",
            },
          ].map((f) => (
            <div
              key={f.label}
              className="p-5 rounded-xl bg-surface/50 border border-border hover:border-border-light transition-colors"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg mb-3"
                style={{ backgroundColor: `${f.color}15` }}
              >
                <f.icon size={16} style={{ color: f.color }} />
              </div>
              <h3 className="text-sm font-semibold text-primary mb-1">{f.label}</h3>
              <p className="text-xs text-cream-dim leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-6 text-center">
        <p className="text-xs text-muted">
          eximIA Maps &middot; Parte do ecossistema eximIA
        </p>
      </footer>
    </div>
  );
}

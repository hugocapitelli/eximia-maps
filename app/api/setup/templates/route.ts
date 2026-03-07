import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STARTER_TEMPLATES = [
  {
    name: "Analise SWOT",
    description: "Forcas, Fraquezas, Oportunidades e Ameacas",
    category: "business",
    node_count: 13,
    data: {
      nodes: [
        { id: "n1", type: "mindmap", position: { x: 0, y: 0 }, data: { label: "Analise SWOT", color: "#82B4C4", level: 0 } },
        { id: "n2", type: "mindmap", position: { x: 280, y: -120 }, data: { label: "Forcas", color: "#22C55E", level: 1, side: "right" } },
        { id: "n3", type: "mindmap", position: { x: 280, y: 120 }, data: { label: "Fraquezas", color: "#EF4444", level: 1, side: "right" } },
        { id: "n4", type: "mindmap", position: { x: -280, y: -120 }, data: { label: "Oportunidades", color: "#3B82F6", level: 1, side: "left" } },
        { id: "n5", type: "mindmap", position: { x: -280, y: 120 }, data: { label: "Ameacas", color: "#F59E0B", level: 1, side: "left" } },
        { id: "n6", type: "mindmap", position: { x: 560, y: -160 }, data: { label: "Ponto forte 1", color: "#22C55E", level: 2, side: "right" } },
        { id: "n7", type: "mindmap", position: { x: 560, y: -80 }, data: { label: "Ponto forte 2", color: "#22C55E", level: 2, side: "right" } },
        { id: "n8", type: "mindmap", position: { x: 560, y: 80 }, data: { label: "Ponto fraco 1", color: "#EF4444", level: 2, side: "right" } },
        { id: "n9", type: "mindmap", position: { x: 560, y: 160 }, data: { label: "Ponto fraco 2", color: "#EF4444", level: 2, side: "right" } },
        { id: "n10", type: "mindmap", position: { x: -560, y: -160 }, data: { label: "Oportunidade 1", color: "#3B82F6", level: 2, side: "left" } },
        { id: "n11", type: "mindmap", position: { x: -560, y: -80 }, data: { label: "Oportunidade 2", color: "#3B82F6", level: 2, side: "left" } },
        { id: "n12", type: "mindmap", position: { x: -560, y: 80 }, data: { label: "Ameaca 1", color: "#F59E0B", level: 2, side: "left" } },
        { id: "n13", type: "mindmap", position: { x: -560, y: 160 }, data: { label: "Ameaca 2", color: "#F59E0B", level: 2, side: "left" } },
      ],
      edges: [
        { id: "e1-2", source: "n1", target: "n2", type: "mindmap", sourceHandle: "right" },
        { id: "e1-3", source: "n1", target: "n3", type: "mindmap", sourceHandle: "right" },
        { id: "e1-4", source: "n1", target: "n4", type: "mindmap", sourceHandle: "left" },
        { id: "e1-5", source: "n1", target: "n5", type: "mindmap", sourceHandle: "left" },
        { id: "e2-6", source: "n2", target: "n6", type: "mindmap" },
        { id: "e2-7", source: "n2", target: "n7", type: "mindmap" },
        { id: "e3-8", source: "n3", target: "n8", type: "mindmap" },
        { id: "e3-9", source: "n3", target: "n9", type: "mindmap" },
        { id: "e4-10", source: "n4", target: "n10", type: "mindmap" },
        { id: "e4-11", source: "n4", target: "n11", type: "mindmap" },
        { id: "e5-12", source: "n5", target: "n12", type: "mindmap" },
        { id: "e5-13", source: "n5", target: "n13", type: "mindmap" },
      ],
    },
  },
  {
    name: "Plano de Projeto",
    description: "Estrutura basica para planejamento de projetos",
    category: "business",
    node_count: 9,
    data: {
      nodes: [
        { id: "n1", type: "mindmap", position: { x: 0, y: 0 }, data: { label: "Plano de Projeto", color: "#82B4C4", level: 0 } },
        { id: "n2", type: "mindmap", position: { x: 280, y: -120 }, data: { label: "Escopo", color: "#C4A882", level: 1, side: "right" } },
        { id: "n3", type: "mindmap", position: { x: 280, y: 40 }, data: { label: "Cronograma", color: "#7C9E8F", level: 1, side: "right" } },
        { id: "n4", type: "mindmap", position: { x: -280, y: -120 }, data: { label: "Recursos", color: "#8B9CC4", level: 1, side: "left" } },
        { id: "n5", type: "mindmap", position: { x: -280, y: 40 }, data: { label: "Riscos", color: "#C48BB4", level: 1, side: "left" } },
        { id: "n6", type: "mindmap", position: { x: 560, y: -160 }, data: { label: "Objetivos", color: "#C4A882", level: 2, side: "right" } },
        { id: "n7", type: "mindmap", position: { x: 560, y: -80 }, data: { label: "Entregas", color: "#C4A882", level: 2, side: "right" } },
        { id: "n8", type: "mindmap", position: { x: 560, y: 0 }, data: { label: "Marcos", color: "#7C9E8F", level: 2, side: "right" } },
        { id: "n9", type: "mindmap", position: { x: 560, y: 80 }, data: { label: "Prazos", color: "#7C9E8F", level: 2, side: "right" } },
      ],
      edges: [
        { id: "e1-2", source: "n1", target: "n2", type: "mindmap", sourceHandle: "right" },
        { id: "e1-3", source: "n1", target: "n3", type: "mindmap", sourceHandle: "right" },
        { id: "e1-4", source: "n1", target: "n4", type: "mindmap", sourceHandle: "left" },
        { id: "e1-5", source: "n1", target: "n5", type: "mindmap", sourceHandle: "left" },
        { id: "e2-6", source: "n2", target: "n6", type: "mindmap" },
        { id: "e2-7", source: "n2", target: "n7", type: "mindmap" },
        { id: "e3-8", source: "n3", target: "n8", type: "mindmap" },
        { id: "e3-9", source: "n3", target: "n9", type: "mindmap" },
      ],
    },
  },
  {
    name: "Brainstorm",
    description: "Estrutura para sessao de brainstorming",
    category: "creative",
    node_count: 7,
    data: {
      nodes: [
        { id: "n1", type: "mindmap", position: { x: 0, y: 0 }, data: { label: "Tema Central", color: "#82B4C4", level: 0 } },
        { id: "n2", type: "mindmap", position: { x: 280, y: -80 }, data: { label: "Ideia 1", color: "#C4A882", level: 1, side: "right" } },
        { id: "n3", type: "mindmap", position: { x: 280, y: 80 }, data: { label: "Ideia 2", color: "#7C9E8F", level: 1, side: "right" } },
        { id: "n4", type: "mindmap", position: { x: -280, y: -80 }, data: { label: "Ideia 3", color: "#8B9CC4", level: 1, side: "left" } },
        { id: "n5", type: "mindmap", position: { x: -280, y: 80 }, data: { label: "Ideia 4", color: "#C48BB4", level: 1, side: "left" } },
        { id: "n6", type: "mindmap", position: { x: 560, y: -80 }, data: { label: "Detalhe", color: "#C4A882", level: 2, side: "right" } },
        { id: "n7", type: "mindmap", position: { x: -560, y: -80 }, data: { label: "Detalhe", color: "#8B9CC4", level: 2, side: "left" } },
      ],
      edges: [
        { id: "e1-2", source: "n1", target: "n2", type: "mindmap", sourceHandle: "right" },
        { id: "e1-3", source: "n1", target: "n3", type: "mindmap", sourceHandle: "right" },
        { id: "e1-4", source: "n1", target: "n4", type: "mindmap", sourceHandle: "left" },
        { id: "e1-5", source: "n1", target: "n5", type: "mindmap", sourceHandle: "left" },
        { id: "e2-6", source: "n2", target: "n6", type: "mindmap" },
        { id: "e4-7", source: "n4", target: "n7", type: "mindmap" },
      ],
    },
  },
];

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  for (const template of STARTER_TEMPLATES) {
    await supabase.from("map_templates").upsert(
      { ...template, is_public: true },
      { onConflict: "name" }
    );
  }

  return NextResponse.json({ ok: true, count: STARTER_TEMPLATES.length });
}

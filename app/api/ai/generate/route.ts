import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { mindMapSchema } from "@/lib/ai/schema";
import { transformAIToReactFlow } from "@/lib/ai/transform";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const {
      prompt,
      style = "default",
      depth = 3,
      language = "pt-BR",
      mode = "generate",
    } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const styleInstructions: Record<string, string> = {
      default: "Estilo equilibrado e informativo",
      academic: "Estilo academico com terminologia tecnica e referencias a conceitos",
      business: "Estilo executivo focado em estrategia, KPIs e resultados",
      creative: "Estilo criativo com analogias, metaforas e conexoes inesperadas",
    };

    let systemPrompt: string;

    if (mode === "import") {
      systemPrompt = `Voce e um especialista em converter estruturas textuais em mapas mentais.

O usuario vai colar um fluxograma, outline, lista hierarquica, indented text, markdown headers, ou qualquer formato textual estruturado.

Sua tarefa:
1. IDENTIFICAR o tema/titulo central — este sera o UNICO node raiz (parentId: null)
2. ANALISAR a estrutura e detectar a hierarquia (niveis pai-filho)
3. CONVERTER fielmente para a estrutura de mapa mental
4. PRESERVAR todos os itens — nao omitir nenhum node
5. MANTER a hierarquia exata do original

REGRAS CRITICAS:
- DEVE haver EXATAMENTE 1 (UM) node com parentId: null — a raiz/titulo central
- Secoes principais (como categorias, capitulos, areas) sao filhas DIRETAS da raiz (parentId: "node-1")
- Sub-itens sao filhos de suas secoes, NAO da raiz
- Em fluxogramas ASCII: o texto na coluna mais a esquerda (ex: "PROGRAMA DE X") e a RAIZ. Os blocos conectados por ├── ou └── sao branches de nivel 1
- Em fluxogramas com tronco vertical: textos como DIAGNOSTICO, PADRONIZACAO, etc. que saem do tronco sao FILHOS da raiz, NAO raizes separadas

Regras adicionais:
- Idioma: ${language}
- IDs devem ser sequenciais: "node-1", "node-2", etc. O node-1 e SEMPRE a raiz
- TODOS os itens do input devem virar nodes — sem perda de informacao
- Use labels concisos mas fieis ao original
- Descriptions sao opcionais — use se o original tem detalhes extras
- Nao ha limite de nodes — converta TUDO que o usuario forneceu
- Respeite a profundidade original (pode ir alem de 3 niveis se necessario)

Formatos que voce sabe interpretar:
- Fluxogramas ASCII (com ┌─ ├─ └─ │)
- Listas com indentacao (tabs ou espacos)
- Markdown headers (# ## ###)
- Bullet points aninhados (- ou *)
- Outlines numerados (1. 1.1 1.1.1)
- Qualquer texto com hierarquia implicita`;
    } else if (mode === "refine") {
      systemPrompt = `Voce e um especialista em mapas mentais. O usuario tem um mapa mental existente e quer modificar.

Voce recebera o mapa atual e um pedido de alteracao. Gere o mapa COMPLETO atualizado incorporando a mudanca.

Regras:
- Idioma: ${language}
- MANTENHA todos os nodes existentes que nao foram explicitamente pedidos para remover
- ADICIONE novos nodes conforme solicitado
- REORGANIZE se pedido
- O primeiro node DEVE ser a raiz (parentId: null)
- IDs devem ser sequenciais: "node-1", "node-2", etc.
- Preserve a estrutura e cores originais quando possivel`;
    } else {
      systemPrompt = `Voce e um especialista em criar mapas mentais estruturados.

Crie um mapa mental sobre o tema fornecido pelo usuario.

Regras:
- Idioma: ${language}
- Estilo: ${styleInstructions[style] || styleInstructions.default}
- Profundidade maxima: ${depth} niveis (raiz = nivel 0)
- O primeiro node DEVE ser a raiz (parentId: null)
- Cada branch principal tem 3-6 sub-items
- Use labels concisos (2-5 palavras)
- Descriptions sao opcionais, use apenas quando agregam contexto
- Gere entre 15-40 nodes no total, dependendo da complexidade
- IDs devem ser sequenciais: "node-1", "node-2", etc.
- Organize logicamente: do mais importante ao menos importante`;
    }

    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: mindMapSchema,
      system: systemPrompt,
      prompt,
    });

    const transformed = transformAIToReactFlow(result.object);

    return Response.json(transformed);
  } catch (error) {
    console.error("AI generation error:", error);
    return Response.json(
      { error: "Failed to generate mind map" },
      { status: 500 }
    );
  }
}

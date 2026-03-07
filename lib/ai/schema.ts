import { z } from "zod";

export const mindMapSchema = z.object({
  title: z.string().describe("Titulo do mapa mental"),
  nodes: z.array(
    z.object({
      id: z.string().describe("ID unico do node, ex: 'node-1', 'node-2'"),
      label: z.string().describe("Texto do node"),
      description: z.string().optional().describe("Descricao curta opcional"),
      parentId: z
        .string()
        .nullable()
        .describe("ID do node pai. null para o node raiz"),
    })
  ),
});

export type MindMapAIOutput = z.infer<typeof mindMapSchema>;

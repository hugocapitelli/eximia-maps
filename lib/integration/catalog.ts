export interface EntitySchema {
  [field: string]: {
    type: "string" | "number" | "boolean" | "object" | "array" | "datetime";
    readonly?: boolean;
    required?: boolean;
    description?: string;
  };
}

export interface EntityDefinition {
  operations: ("list" | "get" | "create" | "update")[];
  schema: EntitySchema;
  description: string;
}

export interface Catalog {
  app: string;
  version: string;
  contract: string;
  entities: Record<string, EntityDefinition>;
  webhooks: { available_events: string[] };
}

export const CATALOG: Catalog = {
  app: "eximia-maps",
  version: "1.0.0",
  contract: "eximia-integration/v1",
  entities: {
    maps: {
      operations: ["list", "get", "create", "update"],
      schema: {
        id: { type: "string", readonly: true, description: "Map unique identifier" },
        title: { type: "string", required: true, description: "Mind map title" },
        slug: { type: "string", readonly: true, description: "URL-safe slug" },
        description: { type: "string", description: "Map description" },
        data: { type: "object", required: true, description: "Mind map nodes and edges (React Flow format)" },
        node_count: { type: "number", readonly: true, description: "Number of nodes" },
        status: { type: "string", description: "Map status (draft, published, archived)" },
        settings: { type: "object", description: "Map display settings" },
        created_at: { type: "datetime", readonly: true, description: "Creation timestamp" },
        updated_at: { type: "datetime", readonly: true, description: "Last update timestamp" },
      },
      description: "Mind maps created by the user",
    },
    templates: {
      operations: ["list", "get"],
      schema: {
        id: { type: "string", readonly: true, description: "Template unique identifier" },
        name: { type: "string", required: true, description: "Template name" },
        description: { type: "string", description: "Template description" },
        category: { type: "string", description: "Template category" },
        data: { type: "object", readonly: true, description: "Template nodes and edges" },
        node_count: { type: "number", readonly: true, description: "Number of nodes" },
        is_public: { type: "boolean", readonly: true, description: "Whether template is public" },
        created_at: { type: "datetime", readonly: true, description: "Creation timestamp" },
      },
      description: "Reusable mind map templates",
    },
  },
  webhooks: {
    available_events: [
      "maps.created",
      "maps.updated",
      "maps.published",
    ],
  },
};

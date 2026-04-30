import type { DiagramDialect, DiagramDocument } from "../types/index.js";

interface CreateEmptyDiagramInput {
  id: string;
  name: string;
  dialect: DiagramDialect;
}

export function createEmptyDiagram(input: CreateEmptyDiagramInput): DiagramDocument {
  const now = new Date().toISOString();

  return {
    format: "erdify.schema.v1",
    id: input.id,
    name: input.name,
    dialect: input.dialect,
    entities: [],
    relationships: [],
    indexes: [],
    views: [],
    layout: { entityPositions: {} },
    metadata: {
      revision: 1,
      stableObjectIds: true,
      createdAt: now,
      updatedAt: now
    }
  };
}

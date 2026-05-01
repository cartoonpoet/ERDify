import type { DiagramDocument, DiagramRelationship } from "../types/index.js";

export function addRelationship(
  doc: DiagramDocument,
  relationship: DiagramRelationship
): DiagramDocument {
  return {
    ...doc,
    relationships: [...doc.relationships, relationship]
  };
}

export function removeRelationship(
  doc: DiagramDocument,
  relationshipId: string
): DiagramDocument {
  return {
    ...doc,
    relationships: doc.relationships.filter((r) => r.id !== relationshipId)
  };
}

export function updateRelationship(
  doc: DiagramDocument,
  relationshipId: string,
  patch: Partial<Omit<DiagramRelationship, "id">>
): DiagramDocument {
  return {
    ...doc,
    relationships: doc.relationships.map((r) =>
      r.id === relationshipId ? { ...r, ...patch } : r
    ),
  };
}

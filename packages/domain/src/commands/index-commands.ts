import type { DiagramDocument, DiagramIndex } from "../types/index.js";

export function addIndex(
  doc: DiagramDocument,
  index: DiagramIndex
): DiagramDocument {
  return { ...doc, indexes: [...doc.indexes, index] };
}

export function removeIndex(
  doc: DiagramDocument,
  indexId: string
): DiagramDocument {
  return { ...doc, indexes: doc.indexes.filter((i) => i.id !== indexId) };
}

export function updateIndex(
  doc: DiagramDocument,
  indexId: string,
  changes: Partial<Omit<DiagramIndex, "id" | "entityId">>
): DiagramDocument {
  return {
    ...doc,
    indexes: doc.indexes.map((i) =>
      i.id === indexId ? { ...i, ...changes } : i
    ),
  };
}

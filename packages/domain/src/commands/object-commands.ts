import type { DiagramDocument, DiagramObject } from "../types/index.js";

export function addObject(
  doc: DiagramDocument,
  object: DiagramObject
): DiagramDocument {
  return { ...doc, objects: [...(doc.objects ?? []), object] };
}

export function removeObject(
  doc: DiagramDocument,
  objectId: string
): DiagramDocument {
  return {
    ...doc,
    objects: (doc.objects ?? []).filter((o) => o.id !== objectId),
  };
}

export function updateObject(
  doc: DiagramDocument,
  objectId: string,
  changes: Partial<Omit<DiagramObject, "id">>
): DiagramDocument {
  return {
    ...doc,
    objects: (doc.objects ?? []).map((o) =>
      o.id === objectId ? { ...o, ...changes } : o
    ),
  };
}

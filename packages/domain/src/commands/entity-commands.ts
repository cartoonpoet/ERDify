import type { DiagramDocument, DiagramEntity, EntityPosition } from "../types/index.js";

export function addEntity(
  doc: DiagramDocument,
  input: { id: string; name: string; position?: EntityPosition }
): DiagramDocument {
  const entity: DiagramEntity = {
    id: input.id,
    name: input.name,
    logicalName: null,
    comment: null,
    color: null,
    columns: []
  };
  const entityPositions = input.position
    ? { ...doc.layout.entityPositions, [input.id]: input.position }
    : doc.layout.entityPositions;
  return {
    ...doc,
    entities: [...doc.entities, entity],
    layout: { ...doc.layout, entityPositions }
  };
}

export function renameEntity(
  doc: DiagramDocument,
  entityId: string,
  name: string
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => (e.id === entityId ? { ...e, name } : e))
  };
}

export function updateEntityColor(
  doc: DiagramDocument,
  entityId: string,
  color: string | null
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => (e.id === entityId ? { ...e, color } : e))
  };
}

export function updateEntityComment(
  doc: DiagramDocument,
  entityId: string,
  comment: string | null
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => (e.id === entityId ? { ...e, comment } : e))
  };
}

export function removeEntity(doc: DiagramDocument, entityId: string): DiagramDocument {
  const { [entityId]: _removed, ...remainingPositions } = doc.layout.entityPositions;
  return {
    ...doc,
    entities: doc.entities.filter((e) => e.id !== entityId),
    relationships: doc.relationships.filter(
      (r) => r.sourceEntityId !== entityId && r.targetEntityId !== entityId
    ),
    indexes: doc.indexes.filter((i) => i.entityId !== entityId),
    layout: { ...doc.layout, entityPositions: remainingPositions }
  };
}

import type { DiagramDocument, EntityPosition } from "../types/index.js";

export function updateEntityPosition(
  doc: DiagramDocument,
  entityId: string,
  position: EntityPosition
): DiagramDocument {
  return {
    ...doc,
    layout: {
      ...doc.layout,
      entityPositions: { ...doc.layout.entityPositions, [entityId]: position }
    }
  };
}

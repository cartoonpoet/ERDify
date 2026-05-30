import type { DiagramColumn, DiagramDocument } from "../types/index.js";

export function addColumn(
  doc: DiagramDocument,
  entityId: string,
  column: DiagramColumn
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) =>
      e.id === entityId ? { ...e, columns: [...e.columns, column] } : e
    )
  };
}

/** 여러 컬럼을 한 번의 불변 갱신으로 추가 (addColumn N회 호출 시의 O(N^2) 문서 복제 방지). */
export function addColumns(
  doc: DiagramDocument,
  entityId: string,
  columns: DiagramColumn[]
): DiagramDocument {
  if (columns.length === 0) return doc;
  return {
    ...doc,
    entities: doc.entities.map((e) =>
      e.id === entityId ? { ...e, columns: [...e.columns, ...columns] } : e
    )
  };
}

export function updateColumn(
  doc: DiagramDocument,
  entityId: string,
  columnId: string,
  changes: Partial<Omit<DiagramColumn, "id">>
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) =>
      e.id === entityId
        ? {
            ...e,
            columns: e.columns.map((c) => (c.id === columnId ? { ...c, ...changes } : c))
          }
        : e
    )
  };
}

export function removeColumn(
  doc: DiagramDocument,
  entityId: string,
  columnId: string
): DiagramDocument {
  const updatedIndexes = doc.indexes
    .map((idx) => ({ ...idx, columnIds: idx.columnIds.filter((id) => id !== columnId) }))
    .filter((idx) => idx.columnIds.length > 0);

  return {
    ...doc,
    entities: doc.entities.map((e) =>
      e.id === entityId ? { ...e, columns: e.columns.filter((c) => c.id !== columnId) } : e
    ),
    relationships: doc.relationships.map((r) => ({
      ...r,
      sourceColumnIds: r.sourceColumnIds.filter((id) => id !== columnId),
      targetColumnIds: r.targetColumnIds.filter((id) => id !== columnId)
    })),
    indexes: updatedIndexes
  };
}

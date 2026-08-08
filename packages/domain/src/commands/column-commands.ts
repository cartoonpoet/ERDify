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

/** ordinal 순서대로 정렬한 뒤 0..n-1로 다시 번호를 매긴다(중복·구멍 난 ordinal 정규화 포함). */
function reindex(columns: DiagramColumn[]): DiagramColumn[] {
  return columns.map((c, i) => (c.ordinal === i ? c : { ...c, ordinal: i }));
}

function sortByOrdinal(columns: DiagramColumn[]): DiagramColumn[] {
  return [...columns].sort((a, b) => a.ordinal - b.ordinal);
}

function clampIndex(position: number, length: number): number {
  if (!Number.isFinite(position)) return length;
  return Math.min(Math.max(Math.trunc(position), 0), length);
}

/**
 * 컬럼을 지정한 위치(0-based)에 끼워 넣고 해당 테이블의 ordinal을 재정렬한다.
 * position을 생략하면 addColumn과 같이 맨 뒤에 붙는다.
 * (MySQL `ADD COLUMN ... AFTER x`를 ERD로 옮길 때 쓴다)
 */
export function insertColumn(
  doc: DiagramDocument,
  entityId: string,
  column: DiagramColumn,
  position?: number
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => {
      if (e.id !== entityId) return e;
      const sorted = sortByOrdinal(e.columns);
      const at = clampIndex(position ?? sorted.length, sorted.length);
      sorted.splice(at, 0, column);
      return { ...e, columns: reindex(sorted) };
    })
  };
}

/** 기존 컬럼을 지정한 위치(0-based)로 옮기고 ordinal을 재정렬한다. */
export function moveColumn(
  doc: DiagramDocument,
  entityId: string,
  columnId: string,
  position: number
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => {
      if (e.id !== entityId) return e;
      const sorted = sortByOrdinal(e.columns);
      const from = sorted.findIndex((c) => c.id === columnId);
      if (from === -1) return e;
      const [moved] = sorted.splice(from, 1);
      sorted.splice(clampIndex(position, sorted.length), 0, moved!);
      return { ...e, columns: reindex(sorted) };
    })
  };
}

/**
 * 컬럼을 `afterColumnId` 바로 뒤로 옮긴다(MySQL `MODIFY COLUMN ... AFTER x`에 대응).
 * afterColumnId가 null이면 맨 앞으로 옮긴다. 대상 컬럼을 찾지 못하면 문서를 그대로 반환한다.
 */
export function moveColumnAfter(
  doc: DiagramDocument,
  entityId: string,
  columnId: string,
  afterColumnId: string | null
): DiagramDocument {
  const entity = doc.entities.find((e) => e.id === entityId);
  if (!entity) return doc;
  if (afterColumnId === null) return moveColumn(doc, entityId, columnId, 0);

  const sorted = sortByOrdinal(entity.columns);
  const from = sorted.findIndex((c) => c.id === columnId);
  const anchor = sorted.findIndex((c) => c.id === afterColumnId);
  if (from === -1 || anchor === -1) return doc;
  // 제거 후 좌표로 환산: 앞에서 뒤로 옮기면 anchor가 한 칸 당겨진다.
  return moveColumn(doc, entityId, columnId, from < anchor ? anchor : anchor + 1);
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

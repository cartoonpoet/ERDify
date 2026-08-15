import type { DiagramDocument, DiagramEntity, DiagramColumn, DiagramIndex, DiagramRelationship } from "@erdify/domain";

/**
 * "삭제 → 추가 → 교집합 갱신" 3-way diff를 draft 배열에 재현한다.
 * prev→next가 "내 변경분"이고 draft에는 원격 변경이 먼저 반영돼 있을 수 있으므로:
 * - 삭제는 prev에 있던 것만 (draft에만 있는 항목 = 원격 추가 → 보존, #111 데이터 유실 방지)
 * - 추가는 prev에도 draft에도 없는 것만 (중복 push 방지, #111 중복 생성 방지)
 *
 * draft는 Automerge.change() 콜백의 프록시 배열이므로 반드시 splice/push/필드 대입으로
 * in-place 변경해야 한다(새 배열을 만들어 반환하면 change op가 기록되지 않는다).
 * 삭제 루프가 역방향인 것도 splice 중 인덱스 밀림을 막기 위한 필수 조건.
 */
function applyListDiff<T extends { id: string }>(
  draftList: T[],
  prevList: T[],
  nextList: T[],
  handlers: {
    /** 추가 시 draft에 넣을 복사본. next와 인스턴스를 공유하면 안 되는 내부 배열은 여기서 복사한다. */
    clone: (item: T) => T;
    /** 교집합 항목의 필드 동기화. 생략하면 추가/삭제만 재현한다. */
    update?: (draftItem: T, prevItem: T | undefined, nextItem: T) => void;
  }
): void {
  const prevIds = new Set(prevList.map((item) => item.id));
  const nextIds = new Set(nextList.map((item) => item.id));

  for (let i = draftList.length - 1; i >= 0; i--) {
    const item = draftList[i];
    if (item && prevIds.has(item.id) && !nextIds.has(item.id)) draftList.splice(i, 1);
  }
  const draftIds = new Set(draftList.map((item) => item.id));
  for (const item of nextList) {
    if (!prevIds.has(item.id) && !draftIds.has(item.id)) draftList.push(handlers.clone(item));
  }
  if (!handlers.update) return;
  for (const nextItem of nextList) {
    if (!prevIds.has(nextItem.id)) continue;
    const draftItem = draftList.find((item) => item.id === nextItem.id);
    if (!draftItem) continue;
    handlers.update(draftItem, prevList.find((item) => item.id === nextItem.id), nextItem);
  }
}

/**
 * 나열된 필드 중 값이 다른 것만 대입한다. "변경된 값만 대입"은 성능 최적화가 아니라
 * Automerge op 최소화 시맨틱이므로, 무조건 대입으로 단순화하면 op 폭증 + 불필요한 충돌이 생긴다.
 */
function copyChangedFields<T>(draft: T, next: T, fields: readonly (keyof T)[]): void {
  for (const field of fields) {
    if (draft[field] !== next[field]) draft[field] = next[field];
  }
}

/** 배열 필드는 요소·순서까지 비교해 달라진 경우에만 통째로 재대입한다 (op 최소화 + next와 인스턴스 분리). */
function syncIdArrayField<T, K extends keyof T>(draft: T, next: T, field: K): void {
  const draftArr = draft[field] as unknown as string[];
  const nextArr = next[field] as unknown as string[];
  if (JSON.stringify(draftArr) !== JSON.stringify(nextArr)) {
    (draft[field] as unknown as string[]) = [...nextArr];
  }
}

const COLUMN_SYNC_FIELDS = [
  "name", "type", "nullable", "primaryKey", "unique", "defaultValue", "comment", "autoIncrement", "onUpdate", "ordinal",
] as const satisfies readonly (keyof DiagramColumn)[];

const ENTITY_SYNC_FIELDS = [
  "schema", "name", "logicalName", "comment", "color",
] as const satisfies readonly (keyof DiagramEntity)[];

const RELATIONSHIP_SYNC_FIELDS = [
  "name", "sourceEntityId", "targetEntityId", "cardinality", "onDelete", "onUpdate", "identifying",
] as const satisfies readonly (keyof DiagramRelationship)[];

const INDEX_SYNC_FIELDS = ["name", "unique"] as const satisfies readonly (keyof DiagramIndex)[];

export function applyColumnDiff(
  draftColumns: DiagramColumn[],
  prevColumns: DiagramColumn[],
  nextColumns: DiagramColumn[]
): void {
  applyListDiff(draftColumns, prevColumns, nextColumns, {
    clone: (col) => ({ ...col }),
    update: (draftCol, _prevCol, nextCol) => copyChangedFields(draftCol, nextCol, COLUMN_SYNC_FIELDS),
  });
}

function syncSeedData(draftEntity: DiagramEntity, prevEntity: DiagramEntity | undefined, nextEntity: DiagramEntity): void {
  if (prevEntity?.seedData === nextEntity.seedData) return;
  if (nextEntity.seedData) {
    draftEntity.seedData = nextEntity.seedData.map((r) => ({ ...r }));
  } else {
    delete draftEntity.seedData;
  }
}

function applyPositionDiff(draft: DiagramDocument, prev: DiagramDocument, next: DiagramDocument): void {
  const prevEntityIds = new Set(prev.entities.map((e) => e.id));
  const nextEntityIds = new Set(next.entities.map((e) => e.id));
  const positions = draft.layout.entityPositions as Record<string, { x: number; y: number }>;
  for (const [id, pos] of Object.entries(next.layout.entityPositions)) {
    const p = prev.layout.entityPositions[id];
    if (p?.x !== pos.x || p?.y !== pos.y) positions[id] = pos;
  }
  for (const id of Object.keys(positions)) {
    // 내가(prev→next) 지운 엔티티의 좌표만 정리 — draft에만 있는 좌표는 원격 추가분이므로 보존
    if (prevEntityIds.has(id) && !nextEntityIds.has(id)) delete positions[id];
  }
}

export function applyDiff(
  draft: DiagramDocument,
  prev: DiagramDocument,
  next: DiagramDocument
): void {
  // 각 블록의 참조 동등성 가드는 스토어 커맨드가 불변 갱신한다는 전제에 의존한다.
  // 값 비교로 바꾸면 성능이 급락하고, 제거하면 op가 폭증한다 — 반드시 유지할 것.
  if (prev.entities !== next.entities) {
    applyListDiff(draft.entities as DiagramEntity[], prev.entities, next.entities, {
      clone: (entity) => ({
        ...entity,
        columns: [...entity.columns],
        ...(entity.seedData ? { seedData: entity.seedData.map((r) => ({ ...r })) } : {}),
      }),
      update: (draftEntity, prevEntity, nextEntity) => {
        if (prevEntity === nextEntity) return;
        copyChangedFields(draftEntity, nextEntity, ENTITY_SYNC_FIELDS);
        applyColumnDiff(draftEntity.columns as DiagramColumn[], prevEntity?.columns ?? [], nextEntity.columns);
        syncSeedData(draftEntity, prevEntity, nextEntity);
      },
    });
  }

  if (prev.layout.entityPositions !== next.layout.entityPositions) {
    applyPositionDiff(draft, prev, next);
  }

  if (prev.relationships !== next.relationships) {
    applyListDiff(draft.relationships as DiagramRelationship[], prev.relationships, next.relationships, {
      clone: (rel) => ({ ...rel, sourceColumnIds: [...rel.sourceColumnIds], targetColumnIds: [...rel.targetColumnIds] }),
      update: (draftRel, _prevRel, nextRel) => {
        copyChangedFields(draftRel, nextRel, RELATIONSHIP_SYNC_FIELDS);
        syncIdArrayField(draftRel, nextRel, "sourceColumnIds");
        syncIdArrayField(draftRel, nextRel, "targetColumnIds");
      },
    });
  }

  if (prev.indexes !== next.indexes) {
    applyListDiff(draft.indexes as DiagramIndex[], prev.indexes, next.indexes, {
      clone: (idx) => ({ ...idx, columnIds: [...idx.columnIds] }),
      update: (draftIdx, _prevIdx, nextIdx) => {
        copyChangedFields(draftIdx, nextIdx, INDEX_SYNC_FIELDS);
        syncIdArrayField(draftIdx, nextIdx, "columnIds");
      },
    });
  }
}

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
 * "내가 바꾼 필드(prev≠next)"만, 그것도 draft와 값이 다를 때만 대입한다.
 * - prev 비교를 빼면 내가 안 건드린 필드의 원격 변경(draft에만 반영됨)을 stale한
 *   내 스냅샷 값으로 되돌린다 (동시 편집 유실).
 * - draft 비교("변경된 값만 대입")는 성능이 아니라 Automerge op 최소화 시맨틱 —
 *   무조건 대입으로 단순화하면 op 폭증 + 불필요한 충돌이 생긴다.
 * prev가 없으면(이론상 도달 불가) 전 필드를 로컬 변경으로 간주한다.
 */
function copyChangedFields<T>(draft: T, prev: T | undefined, next: T, fields: readonly (keyof T)[]): void {
  for (const field of fields) {
    if (prev != null && prev[field] === next[field]) continue;
    if (draft[field] !== next[field]) draft[field] = next[field];
  }
}

/** copyChangedFields의 배열 필드 버전 — 요소·순서까지 값 비교, 재대입 시 인스턴스 분리. */
function syncIdArrayField<T, K extends keyof T>(draft: T, prev: T | undefined, next: T, field: K): void {
  const nextJson = JSON.stringify(next[field]);
  if (prev != null && JSON.stringify(prev[field]) === nextJson) return;
  if (JSON.stringify(draft[field]) !== nextJson) {
    (draft[field] as unknown as string[]) = [...(next[field] as unknown as string[])];
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
    update: (draftCol, prevCol, nextCol) => copyChangedFields(draftCol, prevCol, nextCol, COLUMN_SYNC_FIELDS),
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
        copyChangedFields(draftEntity, prevEntity, nextEntity, ENTITY_SYNC_FIELDS);
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
      update: (draftRel, prevRel, nextRel) => {
        copyChangedFields(draftRel, prevRel, nextRel, RELATIONSHIP_SYNC_FIELDS);
        syncIdArrayField(draftRel, prevRel, nextRel, "sourceColumnIds");
        syncIdArrayField(draftRel, prevRel, nextRel, "targetColumnIds");
      },
    });
  }

  if (prev.indexes !== next.indexes) {
    applyListDiff(draft.indexes as DiagramIndex[], prev.indexes, next.indexes, {
      clone: (idx) => ({ ...idx, columnIds: [...idx.columnIds] }),
      update: (draftIdx, prevIdx, nextIdx) => {
        copyChangedFields(draftIdx, prevIdx, nextIdx, INDEX_SYNC_FIELDS);
        syncIdArrayField(draftIdx, prevIdx, nextIdx, "columnIds");
      },
    });
  }
}

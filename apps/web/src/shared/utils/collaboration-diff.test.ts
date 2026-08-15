import { describe, it, expect } from "vitest";
import { createEmptyDiagram } from "@erdify/domain";
import type { DiagramColumn, DiagramDocument, DiagramEntity } from "@erdify/domain";
import { applyColumnDiff, applyDiff } from "./collaboration-diff";

// Fresh entity fixtures per call, so tests never share (and risk cross-mutating)
// the same array/object instances.
function makeEntities(ids: string[]): DiagramEntity[] {
  return ids.map((id) => ({ id, name: id, logicalName: null, comment: null, color: null, columns: [] }));
}

function makeColumn(id: string, overrides: Partial<DiagramColumn> = {}): DiagramColumn {
  return {
    id,
    name: id,
    type: "varchar",
    nullable: true,
    primaryKey: false,
    unique: false,
    defaultValue: null,
    comment: null,
    ordinal: 0,
    ...overrides,
  };
}

function makeDoc(
  entities: DiagramEntity[],
  entityPositions: Record<string, { x: number; y: number }>
): DiagramDocument {
  const doc = createEmptyDiagram({ id: "d1", name: "test", dialect: "postgresql" });
  doc.entities = entities;
  doc.layout = { entityPositions };
  return doc;
}

describe("applyDiff - layout.entityPositions diff", () => {
  // In the tests below, `prev.entities` and `next.entities` intentionally share the
  // same array reference so that `applyDiff`'s entity-diff branch
  // (`prev.entities !== next.entities`) is skipped, keeping the tests narrowly
  // focused on the layout.entityPositions branch that contains the touched line
  // (S6582: `!p || p.x !== pos.x || p.y !== pos.y` -> `p?.x !== pos.x || p?.y !== pos.y`).

  it("adds a position when prev has no entry for it (property chain absent: p is undefined)", () => {
    const entities = makeEntities(["e1", "e2"]);
    const prev = makeDoc(entities, {});
    const next = makeDoc(entities, { e1: { x: 10, y: 20 } });
    const draft = makeDoc(makeEntities(["e1", "e2"]), {});

    applyDiff(draft, prev, next);

    expect(draft.layout.entityPositions.e1).toEqual({ x: 10, y: 20 });
  });

  it("updates a position when prev has a differing entry (property chain present: p.x/p.y mismatch)", () => {
    const entities = makeEntities(["e1", "e2"]);
    const prev = makeDoc(entities, { e1: { x: 0, y: 0 } });
    const next = makeDoc(entities, { e1: { x: 99, y: 0 } });
    const draft = makeDoc(makeEntities(["e1", "e2"]), { e1: { x: 0, y: 0 } });

    applyDiff(draft, prev, next);

    expect(draft.layout.entityPositions.e1).toEqual({ x: 99, y: 0 });
  });

  it("leaves a position untouched when prev already matches next (property chain present: p.x/p.y equal)", () => {
    const entities = makeEntities(["e1", "e2"]);
    const prev = makeDoc(entities, { e1: { x: 5, y: 5 } });
    const next = makeDoc(entities, { e1: { x: 5, y: 5 } });
    const draftPos = { x: 5, y: 5 };
    const draft = makeDoc(makeEntities(["e1", "e2"]), { e1: draftPos });

    applyDiff(draft, prev, next);

    // Reference equality proves `positions[id] = pos` was NOT executed, i.e. the
    // optional-chaining rewrite still short-circuits exactly like the original
    // `!p || p.x !== pos.x || p.y !== pos.y` guard did for the "no-op" case.
    expect(draft.layout.entityPositions.e1).toBe(draftPos);
    expect(draft.layout.entityPositions.e1).toEqual({ x: 5, y: 5 });
  });

  it("removes a draft position whose entity is no longer present in next.entities", () => {
    const prev = makeDoc(makeEntities(["e1", "e2"]), { e1: { x: 0, y: 0 }, e2: { x: 1, y: 1 } });
    const next = makeDoc(makeEntities(["e1"]), { e1: { x: 0, y: 0 } });
    const draft = makeDoc(makeEntities(["e1", "e2"]), { e1: { x: 0, y: 0 }, e2: { x: 1, y: 1 } });

    applyDiff(draft, prev, next);

    expect(draft.layout.entityPositions).toEqual({ e1: { x: 0, y: 0 } });
  });
});

// ─── 동작 명세 테스트 (#74 리팩터링 안전망 → #111 수정 검증) ──────────────────
// 원래 "[현재 동작:버그]"로 현재 결함을 고정했던 특성화 테스트를, 결함 수정과 함께
// 원하는 동작의 명세로 뒤집었다. diff의 3-way 원칙: 삭제는 prev에 있던 것만,
// 추가는 prev에도 draft에도 없는 것만 — draft에만 있는 항목은 원격 변경이므로 보존.

describe("applyColumnDiff — 특성화", () => {
  it("next에 없는 draft 컬럼을 제거한다", () => {
    const draft = [makeColumn("c1"), makeColumn("c2")];
    applyColumnDiff(draft, [makeColumn("c1"), makeColumn("c2")], [makeColumn("c1")]);
    expect(draft.map((c) => c.id)).toEqual(["c1"]);
  });

  it("prev에 없는 next 컬럼을 얕은 복사로 추가한다", () => {
    const draft = [makeColumn("c1")];
    const added = makeColumn("c2");
    applyColumnDiff(draft, [makeColumn("c1")], [makeColumn("c1"), added]);
    expect(draft.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(draft[1]).not.toBe(added);
    expect(draft[1]).toEqual(added);
  });

  it("공통 컬럼의 8개 스칼라 필드 변경을 모두 전파한다", () => {
    const draft = [makeColumn("c1")];
    const changed = makeColumn("c1", {
      name: "renamed", type: "bigint", nullable: false, primaryKey: true,
      unique: true, defaultValue: "0", comment: "설명", ordinal: 3,
    });
    applyColumnDiff(draft, [makeColumn("c1")], [changed]);
    expect(draft[0]).toEqual(changed);
  });

  it("draft에 없는 공통 컬럼은 조용히 건너뛴다", () => {
    const draft: DiagramColumn[] = [];
    applyColumnDiff(draft, [makeColumn("c1")], [makeColumn("c1", { name: "renamed" })]);
    expect(draft).toEqual([]);
  });

  it("autoIncrement·onUpdate 변경도 전파된다", () => {
    const draft = [makeColumn("c1")];
    applyColumnDiff(
      draft,
      [makeColumn("c1")],
      [makeColumn("c1", { autoIncrement: true, onUpdate: "CURRENT_TIMESTAMP" })],
    );
    expect(draft[0]!.autoIncrement).toBe(true);
    expect(draft[0]!.onUpdate).toBe("CURRENT_TIMESTAMP");
  });

  it("draft에 이미 있는 컬럼은 중복 push하지 않는다", () => {
    const draft = [makeColumn("c1")];
    applyColumnDiff(draft, [], [makeColumn("c1")]);
    expect(draft.map((c) => c.id)).toEqual(["c1"]);
  });

  it("draft에만 있는 컬럼(원격 추가)은 지우지 않는다 — 삭제는 prev에 있던 것만", () => {
    const draft = [makeColumn("c1"), makeColumn("c2_remote")];
    applyColumnDiff(draft, [makeColumn("c1")], [makeColumn("c1")]);
    expect(draft.map((c) => c.id)).toEqual(["c1", "c2_remote"]);
  });
});

describe("applyDiff — entities 특성화", () => {
  it("엔티티 삭제·추가·필드 갱신을 draft에 재현한다", () => {
    const prev = makeDoc(makeEntities(["e1", "e2"]), {});
    const nextE1: DiagramEntity = {
      ...makeEntities(["e1"])[0]!,
      name: "renamed", logicalName: "논리명", comment: "설명", color: "#ff0000",
    };
    const next = makeDoc([nextE1, ...makeEntities(["e3"])], {});
    const draft = makeDoc(makeEntities(["e1", "e2"]), {});

    applyDiff(draft, prev, next);

    expect(draft.entities.map((e) => e.id)).toEqual(["e1", "e3"]);
    expect(draft.entities[0]).toMatchObject({ name: "renamed", logicalName: "논리명", comment: "설명", color: "#ff0000" });
  });

  it("추가된 엔티티의 columns 배열은 next와 다른 인스턴스다", () => {
    const prev = makeDoc([], {});
    const added: DiagramEntity = { ...makeEntities(["e1"])[0]!, columns: [makeColumn("c1")] };
    const next = makeDoc([added], {});
    const draft = makeDoc([], {});

    applyDiff(draft, prev, next);

    expect(draft.entities[0]!.columns).not.toBe(added.columns);
    expect(draft.entities[0]!.columns).toEqual(added.columns);
  });

  it("공통 엔티티의 컬럼 변경을 applyColumnDiff로 전파한다", () => {
    const prevE = { ...makeEntities(["e1"])[0]!, columns: [makeColumn("c1")] };
    const nextE = { ...makeEntities(["e1"])[0]!, columns: [makeColumn("c1", { name: "renamed" }), makeColumn("c2")] };
    const draft = makeDoc([{ ...makeEntities(["e1"])[0]!, columns: [makeColumn("c1")] }], {});

    applyDiff(draft, makeDoc([prevE], {}), makeDoc([nextE], {}));

    expect(draft.entities[0]!.columns.map((c) => [c.id, c.name])).toEqual([["c1", "renamed"], ["c2", "c2"]]);
  });

  it("seedData 추가는 행 단위 복사, 제거는 delete로 재현한다", () => {
    const base = () => makeEntities(["e1"])[0]!;
    const seed = [{ c1: "v1" }];

    const draftAdd = makeDoc([base()], {});
    applyDiff(draftAdd, makeDoc([base()], {}), makeDoc([{ ...base(), seedData: seed }], {}));
    expect(draftAdd.entities[0]!.seedData).toEqual(seed);
    expect(draftAdd.entities[0]!.seedData![0]).not.toBe(seed[0]);

    const withSeed = { ...base(), seedData: [{ c1: "v1" }] };
    const draftRemove = makeDoc([{ ...base(), seedData: [{ c1: "v1" }] }], {});
    applyDiff(draftRemove, makeDoc([withSeed], {}), makeDoc([base()], {}));
    expect("seedData" in draftRemove.entities[0]!).toBe(false);
  });

  it("schema 필드 변경도 전파된다", () => {
    const prevE = makeEntities(["e1"])[0]!;
    const nextE = { ...makeEntities(["e1"])[0]!, schema: "billing" };
    const draft = makeDoc(makeEntities(["e1"]), {});

    applyDiff(draft, makeDoc([prevE], {}), makeDoc([nextE], {}));

    expect(draft.entities[0]!.schema).toBe("billing");
  });

  it("draft에 이미 있는 엔티티는 중복 push하지 않는다 (#111 중복 생성)", () => {
    // 시나리오: 오프라인 구간(prev가 draft보다 오래됨) 후 재합류 병합.
    const draft = makeDoc(makeEntities(["e1"]), {});
    applyDiff(draft, makeDoc([], {}), makeDoc(makeEntities(["e1"]), {}));
    expect(draft.entities.map((e) => e.id)).toEqual(["e1"]);
  });

  it("draft에만 있는 엔티티(원격 추가)는 지우지 않는다 — 삭제는 prev에 있던 것만 (#111 데이터 유실)", () => {
    // 시나리오: 원격 am:change가 amDoc에 먼저 도착하고 스토어 반영 전에 로컬 편집이 송신되는 경합.
    // draft에는 상대가 추가한 e2가 있지만 내 prev/next 스냅샷에는 아직 없다 — 지우면 안 된다.
    const draft = makeDoc(makeEntities(["e1", "e2"]), {});
    applyDiff(draft, makeDoc(makeEntities(["e1"]), {}), makeDoc(makeEntities(["e1"]), {}));
    expect(draft.entities.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("재합류 병합: 마지막 동기화 스냅샷을 base(prev)로 쓰면 상대의 삭제가 보존된다 (#111 부활)", () => {
    // prev = 연결 끊기기 전 마지막 동기화 문서(e1, e2), next = 내 로컬 문서(e2 유지),
    // draft = 서버 문서(상대가 e2를 지움). 나는 e2를 건드리지 않았으므로 부활시키면 안 된다.
    const lastSyncedDoc = makeDoc(makeEntities(["e1", "e2"]), {});
    const localDoc = makeDoc(makeEntities(["e1", "e2"]), {});
    const draft = makeDoc(makeEntities(["e1"]), {});

    applyDiff(draft, lastSyncedDoc, localDoc);

    expect(draft.entities.map((e) => e.id)).toEqual(["e1"]);
  });

  it("추가된 엔티티의 seedData는 행 단위로 복사되어 next와 인스턴스를 공유하지 않는다", () => {
    const added: DiagramEntity = { ...makeEntities(["e1"])[0]!, seedData: [{ c1: "v1" }] };
    const draft = makeDoc([], {});

    applyDiff(draft, makeDoc([], {}), makeDoc([added], {}));

    expect(draft.entities[0]!.seedData).toEqual([{ c1: "v1" }]);
    expect(draft.entities[0]!.seedData).not.toBe(added.seedData);
    expect(draft.entities[0]!.seedData![0]).not.toBe(added.seedData![0]);
  });
});

describe("applyDiff — relationships 특성화", () => {
  const makeRel = (id: string, overrides: Partial<DiagramDocument["relationships"][number]> = {}) => ({
    id, name: "", sourceEntityId: "e1", sourceColumnIds: ["c1"], targetEntityId: "e2", targetColumnIds: ["c2"],
    cardinality: "many-to-one" as const, onDelete: "no-action" as const, onUpdate: "no-action" as const,
    identifying: false, ...overrides,
  });

  it("관계 삭제·추가를 draft에 재현한다", () => {
    const draft = makeDoc([], {});
    draft.relationships = [makeRel("r1"), makeRel("r2")];
    const prev = makeDoc([], {});
    prev.relationships = [makeRel("r1"), makeRel("r2")];
    const next = makeDoc([], {});
    next.relationships = [makeRel("r1"), makeRel("r3")];

    applyDiff(draft, prev, next);

    expect(draft.relationships.map((r) => r.id)).toEqual(["r1", "r3"]);
  });

  it("같은 id 관계의 필드 변경(cardinality·onDelete·name·컬럼 매핑)이 전파된다", () => {
    const draft = makeDoc([], {});
    draft.relationships = [makeRel("r1")];
    const prev = makeDoc([], {});
    prev.relationships = [makeRel("r1")];
    const next = makeDoc([], {});
    next.relationships = [makeRel("r1", { cardinality: "one-to-one", onDelete: "cascade", name: "fk_renamed", sourceColumnIds: ["c9"] })];

    applyDiff(draft, prev, next);

    expect(draft.relationships[0]).toMatchObject({
      cardinality: "one-to-one", onDelete: "cascade", name: "fk_renamed", sourceColumnIds: ["c9"],
    });
  });

  it("관계 컬럼 매핑이 내용까지 같으면 배열을 재대입하지 않는다 (op 최소화)", () => {
    const draftIds = ["c1"];
    const draft = makeDoc([], {});
    draft.relationships = [makeRel("r1", { sourceColumnIds: draftIds })];
    const prev = makeDoc([], {});
    prev.relationships = [makeRel("r1")];
    const next = makeDoc([], {});
    next.relationships = [makeRel("r1")];

    applyDiff(draft, prev, next);

    expect(draft.relationships[0]!.sourceColumnIds).toBe(draftIds);
  });

  it("추가된 관계의 sourceColumnIds·targetColumnIds는 next와 다른 인스턴스다", () => {
    const draft = makeDoc([], {});
    const prev = makeDoc([], {});
    const added = makeRel("r1");
    const next = makeDoc([], {});
    next.relationships = [added];

    applyDiff(draft, prev, next);

    expect(draft.relationships[0]!.sourceColumnIds).not.toBe(added.sourceColumnIds);
    expect(draft.relationships[0]!.sourceColumnIds).toEqual(added.sourceColumnIds);
    expect(draft.relationships[0]!.targetColumnIds).not.toBe(added.targetColumnIds);
  });
});

describe("applyDiff — indexes 특성화", () => {
  const makeIdx = (id: string, overrides: Partial<DiagramDocument["indexes"][number]> = {}) => ({
    id, entityId: "e1", name: `idx_${id}`, columnIds: ["c1"], unique: false, ...overrides,
  });

  it("인덱스 삭제·추가를 재현하고, 추가 시 columnIds는 새 인스턴스다", () => {
    const draft = makeDoc([], {});
    draft.indexes = [makeIdx("i1")];
    const prev = makeDoc([], {});
    prev.indexes = [makeIdx("i1")];
    const added = makeIdx("i2");
    const next = makeDoc([], {});
    next.indexes = [makeIdx("i1"), added];

    applyDiff(draft, prev, next);

    expect(draft.indexes.map((i) => i.id)).toEqual(["i1", "i2"]);
    expect(draft.indexes[1]!.columnIds).not.toBe(added.columnIds);
  });

  it("공통 인덱스의 name/unique/columnIds(순서 포함) 변경을 전파한다", () => {
    const draft = makeDoc([], {});
    draft.indexes = [makeIdx("i1", { columnIds: ["c1", "c2"] })];
    const prev = makeDoc([], {});
    prev.indexes = [makeIdx("i1", { columnIds: ["c1", "c2"] })];
    const next = makeDoc([], {});
    next.indexes = [makeIdx("i1", { name: "ux_renamed", unique: true, columnIds: ["c2", "c1"] })];

    applyDiff(draft, prev, next);

    expect(draft.indexes[0]).toMatchObject({ name: "ux_renamed", unique: true, columnIds: ["c2", "c1"] });
  });

  it("columnIds가 내용까지 같으면 배열을 재대입하지 않는다 (op 최소화)", () => {
    const draftCols = ["c1", "c2"];
    const draft = makeDoc([], {});
    draft.indexes = [makeIdx("i1", { columnIds: draftCols })];
    const prev = makeDoc([], {});
    prev.indexes = [makeIdx("i1", { columnIds: ["c1", "c2"] })];
    const next = makeDoc([], {});
    next.indexes = [makeIdx("i1", { columnIds: ["c1", "c2"] })];

    applyDiff(draft, prev, next);

    expect(draft.indexes[0]!.columnIds).toBe(draftCols);
  });
});

// 동시 편집: 필드 동기화는 "내가 바꾼 필드(prev≠next)"만 대입해야 한다.
// draft에만 있는 원격 필드 변경을 내 stale 스냅샷 값으로 되돌리면 안 된다.
describe("applyDiff — 동시 필드 편집 (원격 변경 보존)", () => {
  it("컬럼: 로컬 name 변경은 적용되고 원격 comment 변경은 보존된다", () => {
    const draft = [makeColumn("c1", { comment: "원격이 단 설명" })];
    applyColumnDiff(draft, [makeColumn("c1")], [makeColumn("c1", { name: "renamed" })]);
    expect(draft[0]).toMatchObject({ name: "renamed", comment: "원격이 단 설명" });
  });

  it("엔티티: 로컬 name 변경은 적용되고 원격 color 변경은 보존된다", () => {
    const draft = makeDoc([{ ...makeEntities(["e1"])[0]!, color: "#00ff00" }], {});
    const prev = makeDoc(makeEntities(["e1"]), {});
    const next = makeDoc([{ ...makeEntities(["e1"])[0]!, name: "renamed" }], {});

    applyDiff(draft, prev, next);

    expect(draft.entities[0]).toMatchObject({ name: "renamed", color: "#00ff00" });
  });

  it("관계: 로컬 name 변경은 적용되고 원격 onDelete·sourceColumnIds 변경은 보존된다", () => {
    const makeRel = (overrides: Partial<DiagramDocument["relationships"][number]> = {}) => ({
      id: "r1", name: "", sourceEntityId: "e1", sourceColumnIds: ["c1"], targetEntityId: "e2", targetColumnIds: ["c2"],
      cardinality: "many-to-one" as const, onDelete: "no-action" as const, onUpdate: "no-action" as const,
      identifying: false, ...overrides,
    });
    const draft = makeDoc([], {});
    draft.relationships = [makeRel({ onDelete: "cascade", sourceColumnIds: ["c9"] })];
    const prev = makeDoc([], {});
    prev.relationships = [makeRel()];
    const next = makeDoc([], {});
    next.relationships = [makeRel({ name: "fk_renamed" })];

    applyDiff(draft, prev, next);

    expect(draft.relationships[0]).toMatchObject({
      name: "fk_renamed", onDelete: "cascade", sourceColumnIds: ["c9"],
    });
  });

  it("인덱스: 로컬 name 변경은 적용되고 원격 unique·columnIds 변경은 보존된다", () => {
    const makeIdx = (overrides: Partial<DiagramDocument["indexes"][number]> = {}) => ({
      id: "i1", entityId: "e1", name: "idx_a", columnIds: ["c1"], unique: false, ...overrides,
    });
    const draft = makeDoc([], {});
    draft.indexes = [makeIdx({ unique: true, columnIds: ["c1", "c2"] })];
    const prev = makeDoc([], {});
    prev.indexes = [makeIdx()];
    const next = makeDoc([], {});
    next.indexes = [makeIdx({ name: "idx_renamed" })];

    applyDiff(draft, prev, next);

    expect(draft.indexes[0]).toMatchObject({ name: "idx_renamed", unique: true, columnIds: ["c1", "c2"] });
  });
});

describe("applyDiff — Automerge 통합 (실제 draft 프록시)", () => {
  it("삭제+추가+갱신 종합 변경이 피어 replica에 그대로 재현된다", async () => {
    const Automerge = await import("@automerge/automerge");

    const prev = makeDoc(
      [
        { ...makeEntities(["e1"])[0]!, columns: [makeColumn("c1")] },
        makeEntities(["e2"])[0]!,
      ],
      { e1: { x: 0, y: 0 }, e2: { x: 1, y: 1 } },
    );
    const next = makeDoc(
      [
        { ...makeEntities(["e1"])[0]!, name: "renamed", columns: [makeColumn("c1", { name: "id2" }), makeColumn("c2")] },
        makeEntities(["e3"])[0]!,
      ],
      { e1: { x: 10, y: 20 }, e3: { x: 5, y: 5 } },
    );

    const base = Automerge.from(structuredClone(prev) as unknown as Record<string, unknown>) as import("@automerge/automerge").Doc<DiagramDocument>;
    const peer = Automerge.clone(base);

    const updated = Automerge.change(base, (draft) => {
      applyDiff(draft as DiagramDocument, prev, next);
    });
    const change = Automerge.getLastLocalChange(updated);
    expect(change).toBeDefined();

    const [peerSynced] = Automerge.applyChanges(peer, [change!]);
    const result = structuredClone(peerSynced) as DiagramDocument;
    expect(result.entities.map((e) => e.id)).toEqual(["e1", "e3"]);
    expect(result.entities[0]).toMatchObject({ name: "renamed" });
    expect(result.entities[0]!.columns.map((c) => [c.id, c.name])).toEqual([["c1", "id2"], ["c2", "c2"]]);
    expect(result.layout.entityPositions).toEqual({ e1: { x: 10, y: 20 }, e3: { x: 5, y: 5 } });
  });

  it("내용 변화가 없으면 Automerge op를 만들지 않는다 (조건부 대입 시맨틱)", async () => {
    const Automerge = await import("@automerge/automerge");

    const prev = makeDoc([{ ...makeEntities(["e1"])[0]!, columns: [makeColumn("c1")] }], { e1: { x: 0, y: 0 } });
    // 내용은 같지만 참조가 달라 가드를 통과하는 next — 필드 비교가 대입을 전부 걸러야 한다
    const next = structuredClone(prev);

    const base = Automerge.from(structuredClone(prev) as unknown as Record<string, unknown>) as import("@automerge/automerge").Doc<DiagramDocument>;
    const headsBefore = Automerge.getHeads(base);
    const updated = Automerge.change(base, (draft) => {
      applyDiff(draft as DiagramDocument, prev, next);
    });

    // op가 하나도 없으면 change가 만들어지지 않아 heads가 그대로다
    expect(Automerge.getHeads(updated)).toEqual(headsBefore);
  });
});

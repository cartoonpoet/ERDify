import * as Automerge from "@automerge/automerge";
import type { Patch } from "@automerge/automerge";
import type { DiagramDocument } from "@erdify/domain";
import { applyPatchesImmutable } from "./apply-patches-immutable";

const makeDoc = (): DiagramDocument => ({
  format: "erdify.schema.v1",
  id: "d1",
  name: "Test",
  dialect: "postgresql",
  entities: ["a", "b", "c"].map((id) => ({
    id,
    name: `table_${id}`,
    logicalName: null,
    comment: null,
    color: null,
    columns: [{ id: `${id}-c1`, name: "id", type: "bigint" } as DiagramDocument["entities"][number]["columns"][number]],
  })),
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, c: { x: 200, y: 0 } } },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
});

// 피어 A가 만든 변경을 피어 B에 적용하면서 패치를 받아, 일반 객체 사본에 적용한 결과와
// Automerge 문서를 그대로 복사한 결과가 같은지 본다
const roundTrip = (edit: (d: DiagramDocument) => void) => {
  const origin = Automerge.from(makeDoc() as unknown as Record<string, unknown>);
  const peerA = Automerge.clone(origin);
  const peerB = Automerge.clone(origin);
  const edited = Automerge.change(peerA, (d) => edit(d as unknown as DiagramDocument));
  const changes = Automerge.getChanges(peerA, edited);

  let patches: Patch[] = [];
  const [peerBNext] = Automerge.applyChanges(peerB, changes, { patchCallback: (p) => { patches = p; } });

  const base = structuredClone(peerB) as unknown as DiagramDocument;
  const frozenBase = structuredClone(base);
  const next = applyPatchesImmutable(base, patches, Automerge.applyPatch);
  return { base, frozenBase, next, expected: structuredClone(peerBNext) as unknown as DiagramDocument };
};

describe("applyPatchesImmutable", () => {
  it("좌표 변경: 결과가 Automerge 문서와 같고, 바뀌지 않은 테이블은 참조가 유지된다", () => {
    const { base, frozenBase, next, expected } = roundTrip((d) => { d.layout.entityPositions["b"]!.y = 500; });

    expect(next).toEqual(expected);
    expect(base).toEqual(frozenBase); // 원본은 건드리지 않는다
    expect(next.entities).toBe(base.entities);
    expect(next.layout.entityPositions["a"]).toBe(base.layout.entityPositions["a"]);
    expect(next.layout.entityPositions["b"]).not.toBe(base.layout.entityPositions["b"]);
  });

  it("테이블 이름 텍스트 편집(splice/del 패치)", () => {
    const { base, frozenBase, next, expected } = roundTrip((d) => {
      Automerge.splice(d as unknown as Automerge.Doc<unknown>, ["entities", 1, "name"], 0, 7, "orders");
    });

    expect(next).toEqual(expected);
    expect(next.entities[1]!.name).toBe("orders");
    expect(base).toEqual(frozenBase);
    expect(next.entities[0]).toBe(base.entities[0]);
    expect(next.entities[2]).toBe(base.entities[2]);
  });

  it("테이블 추가·삭제와 컬럼 추가가 섞여도 같다", () => {
    const { base, frozenBase, next, expected } = roundTrip((d) => {
      d.entities.splice(0, 1);
      d.entities.push({ id: "z", name: "new_table", logicalName: null, comment: null, color: null, columns: [] });
      d.entities[0]!.columns.push({ id: "b-c2", name: "user_id", type: "bigint" } as DiagramDocument["entities"][number]["columns"][number]);
      delete d.layout.entityPositions["a"];
      d.layout.entityPositions["z"] = { x: 9, y: 9 };
    });

    expect(next).toEqual(expected);
    expect(base).toEqual(frozenBase);
  });

  it("패치가 없으면 내용이 같은 새 루트를 돌려준다", () => {
    const base = makeDoc();
    const next = applyPatchesImmutable(base, [], Automerge.applyPatch);
    expect(next).toEqual(base);
    expect(next.entities).toBe(base.entities);
  });
});

import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "./entity-commands.js";
import { addColumn, addColumns, removeColumn, updateColumn } from "./column-commands.js";
import { addIndex } from "./index-commands.js";
import { insertColumn, moveColumn, moveColumnAfter } from "./column-commands.js";
import type { DiagramColumn, DiagramDocument } from "../types/index.js";

const base = () => {
  const doc = createEmptyDiagram({ id: "d1", name: "Test", dialect: "postgresql" });
  return addEntity(doc, { id: "e1", name: "users" });
};

const col = (overrides: Partial<DiagramColumn> = {}): DiagramColumn => ({
  id: "c1", name: "id", type: "uuid", nullable: false,
  primaryKey: true, unique: true, defaultValue: null, comment: null, ordinal: 0,
  ...overrides
});

describe("addColumn", () => {
  it("adds column to the entity", () => {
    const doc = addColumn(base(), "e1", col());
    expect(doc.entities[0].columns).toHaveLength(1);
    expect(doc.entities[0].columns[0].name).toBe("id");
  });

  it("does not affect other entities", () => {
    let doc = addEntity(base(), { id: "e2", name: "orders" });
    doc = addColumn(doc, "e1", col());
    expect(doc.entities[1].columns).toHaveLength(0);
  });
});

describe("addColumns", () => {
  it("adds multiple columns in one call", () => {
    const doc = addColumns(base(), "e1", [
      col({ id: "c1", name: "id", ordinal: 0 }),
      col({ id: "c2", name: "email", ordinal: 1 }),
    ]);
    expect(doc.entities[0].columns.map((c) => c.name)).toEqual(["id", "email"]);
  });

  it("returns the same doc reference when columns is empty", () => {
    const doc = base();
    expect(addColumns(doc, "e1", [])).toBe(doc);
  });

  it("appends to existing columns and leaves other entities untouched", () => {
    let doc = addEntity(base(), { id: "e2", name: "orders" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", ordinal: 0 }));
    doc = addColumns(doc, "e1", [col({ id: "c2", name: "name", ordinal: 1 })]);
    expect(doc.entities[0].columns).toHaveLength(2);
    expect(doc.entities[1].columns).toHaveLength(0);
  });
});

describe("updateColumn", () => {
  it("updates specified fields only", () => {
    let doc = addColumn(base(), "e1", col());
    doc = updateColumn(doc, "e1", "c1", { name: "user_id", nullable: true });
    expect(doc.entities[0].columns[0].name).toBe("user_id");
    expect(doc.entities[0].columns[0].nullable).toBe(true);
    expect(doc.entities[0].columns[0].primaryKey).toBe(true);
  });
});

describe("removeColumn", () => {
  it("removes column from entity", () => {
    let doc = addColumn(base(), "e1", col());
    doc = removeColumn(doc, "e1", "c1");
    expect(doc.entities[0].columns).toHaveLength(0);
  });

  it("removes column id from relationship column lists", () => {
    let doc = addEntity(base(), { id: "e2", name: "orders" });
    doc = addColumn(doc, "e1", col({ id: "c_id" }));
    doc = addColumn(doc, "e2", col({ id: "c_user_id", name: "user_id", primaryKey: false }));
    doc = {
      ...doc,
      relationships: [{
        id: "r1", name: "fk", sourceEntityId: "e2", sourceColumnIds: ["c_user_id"],
        targetEntityId: "e1", targetColumnIds: ["c_id"], cardinality: "many-to-one",
        onDelete: "restrict", onUpdate: "no-action"
      }]
    };
    doc = removeColumn(doc, "e1", "c_id");
    expect(doc.relationships[0].targetColumnIds).toHaveLength(0);
  });
});

describe("removeColumn — index cleanup", () => {
  it("removes columnId from indexes and deletes empty indexes", () => {
    let doc = addColumn(base(), "e1", col({ id: "c1" }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email" }));
    // composite index on c1+c2, simple index on c2
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_composite", columnIds: ["c1", "c2"], unique: false });
    doc = addIndex(doc, { id: "i2", entityId: "e1", name: "idx_simple", columnIds: ["c1"], unique: false });
    doc = removeColumn(doc, "e1", "c1");
    // i1 should still exist with only c2 remaining
    expect(doc.indexes.find((i) => i.id === "i1")?.columnIds).toEqual(["c2"]);
    // i2 had only c1, so it should be deleted
    expect(doc.indexes.find((i) => i.id === "i2")).toBeUndefined();
  });
});

describe("insertColumn / moveColumn / moveColumnAfter — 컬럼 위치 (#109)", () => {
  const names = (doc: DiagramDocument): string[] =>
    [...doc.entities[0]!.columns].sort((a, b) => a.ordinal - b.ordinal).map((c) => c.name);

  const articleDoc = (): DiagramDocument => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "Article" });
    doc = addColumns(doc, "e1", [
      col({ id: "c1", name: "ArticleID", ordinal: 0 }),
      col({ id: "c2", name: "ManageNo", ordinal: 1 }),
      col({ id: "c3", name: "Title", ordinal: 2 }),
    ]);
    return doc;
  };

  it("지정한 위치에 컬럼을 끼워 넣고 ordinal을 0..n-1로 다시 매긴다", () => {
    const doc = insertColumn(articleDoc(), "e1", col({ id: "c9", name: "CategoryCode" }), 2);
    expect(names(doc)).toEqual(["ArticleID", "ManageNo", "CategoryCode", "Title"]);
    expect(doc.entities[0]!.columns.map((c) => c.ordinal)).toEqual([0, 1, 2, 3]);
  });

  it("position을 생략하면 맨 뒤에 붙는다", () => {
    expect(names(insertColumn(articleDoc(), "e1", col({ id: "c9", name: "Z" })))).toEqual([
      "ArticleID", "ManageNo", "Title", "Z",
    ]);
  });

  it("범위를 넘는 position은 양 끝으로 자른다", () => {
    expect(names(insertColumn(articleDoc(), "e1", col({ id: "c9", name: "Z" }), 99)).at(-1)).toBe("Z");
    expect(names(insertColumn(articleDoc(), "e1", col({ id: "c9", name: "Z" }), -5))[0]).toBe("Z");
  });

  it("moveColumn은 최종 인덱스 기준으로 컬럼을 옮긴다", () => {
    expect(names(moveColumn(articleDoc(), "e1", "c3", 0))).toEqual(["Title", "ArticleID", "ManageNo"]);
    expect(names(moveColumn(articleDoc(), "e1", "c1", 2))).toEqual(["ManageNo", "Title", "ArticleID"]);
  });

  it("moveColumnAfter는 방향에 상관없이 앵커 바로 뒤에 놓는다", () => {
    // 뒤 → 앞
    expect(names(moveColumnAfter(articleDoc(), "e1", "c3", "c1"))).toEqual(["ArticleID", "Title", "ManageNo"]);
    // 앞 → 뒤
    expect(names(moveColumnAfter(articleDoc(), "e1", "c1", "c2"))).toEqual(["ManageNo", "ArticleID", "Title"]);
  });

  it("moveColumnAfter(null)은 맨 앞으로 옮긴다", () => {
    expect(names(moveColumnAfter(articleDoc(), "e1", "c3", null))).toEqual(["Title", "ArticleID", "ManageNo"]);
  });

  it("존재하지 않는 컬럼·앵커·테이블이면 문서를 그대로 둔다", () => {
    const doc = articleDoc();
    expect(moveColumnAfter(doc, "e1", "nope", "c1")).toBe(doc);
    expect(moveColumnAfter(doc, "e1", "c1", "nope")).toBe(doc);
    expect(moveColumnAfter(doc, "nope", "c1", "c2")).toBe(doc);
    expect(names(moveColumn(doc, "e1", "nope", 0))).toEqual(names(doc));
  });

  it("ordinal이 중복·불연속이어도 정규화한다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "Article" });
    doc = addColumns(doc, "e1", [
      col({ id: "c1", name: "a", ordinal: 5 }),
      col({ id: "c2", name: "b", ordinal: 5 }),
    ]);
    const out = insertColumn(doc, "e1", col({ id: "c3", name: "c" }), 1);
    expect(out.entities[0]!.columns.map((c) => c.ordinal)).toEqual([0, 1, 2]);
  });
});

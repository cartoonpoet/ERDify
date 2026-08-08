import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity, removeEntity, renameEntity, setSeedData, updateEntity, updateEntityComment } from "./entity-commands.js";
import { addIndex } from "./index-commands.js";
import { addColumn } from "./column-commands.js";
import type { DiagramColumn, DiagramRelationship } from "../types/index.js";

const col = (overrides: Partial<DiagramColumn>): DiagramColumn => ({
  id: "c1", name: "id", type: "INT", nullable: false,
  primaryKey: true, unique: false, defaultValue: null, comment: null, ordinal: 0,
  ...overrides,
});

const base = () => createEmptyDiagram({ id: "d1", name: "Test", dialect: "postgresql" });

describe("addEntity", () => {
  it("adds entity to document", () => {
    const doc = addEntity(base(), { id: "e1", name: "users" });
    expect(doc.entities).toHaveLength(1);
    expect(doc.entities[0]).toMatchObject({ id: "e1", name: "users", columns: [] });
  });

  it("stores position in layout when provided", () => {
    const doc = addEntity(base(), { id: "e1", name: "users", position: { x: 100, y: 200 } });
    expect(doc.layout.entityPositions["e1"]).toEqual({ x: 100, y: 200 });
  });

  it("does not mutate the original document", () => {
    const original = base();
    addEntity(original, { id: "e1", name: "users" });
    expect(original.entities).toHaveLength(0);
  });
});

describe("renameEntity", () => {
  it("renames the target entity", () => {
    const doc = renameEntity(addEntity(base(), { id: "e1", name: "users" }), "e1", "accounts");
    expect(doc.entities[0].name).toBe("accounts");
  });

  it("leaves other entities unchanged", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = addEntity(doc, { id: "e2", name: "orders" });
    doc = renameEntity(doc, "e1", "accounts");
    expect(doc.entities[1].name).toBe("orders");
  });
});

describe("removeEntity", () => {
  it("removes the entity", () => {
    const doc = removeEntity(addEntity(base(), { id: "e1", name: "users" }), "e1");
    expect(doc.entities).toHaveLength(0);
  });

  it("removes its layout position", () => {
    let doc = addEntity(base(), { id: "e1", name: "users", position: { x: 10, y: 20 } });
    doc = removeEntity(doc, "e1");
    expect(doc.layout.entityPositions["e1"]).toBeUndefined();
  });

  it("cascades removal to referencing relationships", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = addEntity(doc, { id: "e2", name: "orders" });
    const rel: DiagramRelationship = {
      id: "r1", name: "fk", sourceEntityId: "e1", sourceColumnIds: [],
      targetEntityId: "e2", targetColumnIds: [], cardinality: "one-to-many",
      onDelete: "cascade", onUpdate: "no-action", identifying: false
    };
    doc = { ...doc, relationships: [rel] };
    doc = removeEntity(doc, "e1");
    expect(doc.relationships).toHaveLength(0);
  });
});

describe("updateEntityComment", () => {
  it("sets comment on entity", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    expect(doc.entities[0].comment).toBe("사용자 테이블");
  });

  it("clears comment when null", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "some comment");
    doc = updateEntityComment(doc, "e1", null);
    expect(doc.entities[0].comment).toBeNull();
  });
});

describe("removeEntity — index cleanup", () => {
  it("removes indexes belonging to the deleted entity", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = addEntity(doc, { id: "e2", name: "orders" });
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_users_email", columnIds: ["c1"], unique: false });
    doc = addIndex(doc, { id: "i2", entityId: "e2", name: "idx_orders_user", columnIds: ["c2"], unique: false });
    doc = removeEntity(doc, "e1");
    expect(doc.indexes).toHaveLength(1);
    expect(doc.indexes[0].id).toBe("i2");
  });
});

describe("setSeedData", () => {
  it("sets seedData on the correct entity while leaving others unchanged", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = addEntity(doc, { id: "e2", name: "orders" });
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const rows = [{ c1: "1" }, { c1: "2" }];
    doc = setSeedData(doc, "e1", rows);
    expect(doc.entities[0].seedData).toEqual(rows);
    expect(doc.entities[1].seedData).toBeUndefined();
  });

  it("replaces existing seedData with new rows", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    doc = setSeedData(doc, "e1", [{ c1: "old" }]);
    doc = setSeedData(doc, "e1", [{ c1: "new1" }, { c1: "new2" }]);
    expect(doc.entities[0].seedData).toEqual([{ c1: "new1" }, { c1: "new2" }]);
  });

  it("clears seedData when passed an empty array", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    doc = setSeedData(doc, "e1", [{ c1: "1" }]);
    doc = setSeedData(doc, "e1", []);
    expect(doc.entities[0].seedData).toEqual([]);
  });

  it("does not mutate the original document", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const original = doc;
    setSeedData(doc, "e1", [{ c1: "1" }]);
    expect(original.entities[0].seedData).toBeUndefined();
  });
});

describe("updateEntity — 테이블 부분 갱신 (#107)", () => {
  const doc = () => {
    const d = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    return addEntity(d, { id: "e1", name: "Orders  ", schema: "Sales" });
  };

  it("주어진 필드만 바꾸고 나머지는 유지한다", () => {
    const out = updateEntity(doc(), "e1", { name: "Orders" });
    expect(out.entities[0]!.name).toBe("Orders");
    expect(out.entities[0]!.schema).toBe("Sales");
  });

  it("schema·comment·logicalName·color를 한 번에 바꿀 수 있다", () => {
    const out = updateEntity(doc(), "e1", {
      schema: "Legal", comment: "주문", logicalName: "주문 테이블", color: "#4f46e5",
    });
    expect(out.entities[0]).toMatchObject({
      schema: "Legal", comment: "주문", logicalName: "주문 테이블", color: "#4f46e5",
    });
  });

  it("null을 주면 값을 지운다", () => {
    expect(updateEntity(doc(), "e1", { schema: null }).entities[0]!.schema).toBeNull();
  });

  it("컬럼과 id는 건드리지 않는다", () => {
    let d = doc();
    d = addColumn(d, "e1", col({ id: "c1" }));
    const out = updateEntity(d, "e1", { name: "X" });
    expect(out.entities[0]!.id).toBe("e1");
    expect(out.entities[0]!.columns).toHaveLength(1);
  });

  it("없는 테이블 id면 문서를 그대로 둔다", () => {
    const d = doc();
    expect(updateEntity(d, "nope", { name: "X" }).entities).toEqual(d.entities);
  });
});

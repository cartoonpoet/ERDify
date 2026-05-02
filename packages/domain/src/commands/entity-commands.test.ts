import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity, removeEntity, renameEntity, updateEntityComment } from "./entity-commands.js";
import { addIndex } from "./index-commands.js";
import type { DiagramRelationship } from "../types/index.js";

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

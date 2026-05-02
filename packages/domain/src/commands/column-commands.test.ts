import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "./entity-commands.js";
import { addColumn, removeColumn, updateColumn } from "./column-commands.js";
import { addIndex } from "./index-commands.js";
import type { DiagramColumn } from "../types/index.js";

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

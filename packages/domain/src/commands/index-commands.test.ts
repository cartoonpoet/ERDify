import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "./entity-commands.js";
import { addIndex, removeIndex, updateIndex } from "./index-commands.js";
import type { DiagramIndex } from "../types/index.js";

const base = () => addEntity(
  createEmptyDiagram({ id: "d1", name: "Test", dialect: "postgresql" }),
  { id: "e1", name: "users" }
);

const idx = (overrides: Partial<DiagramIndex> = {}): DiagramIndex => ({
  id: "i1", entityId: "e1", name: "idx_users_email",
  columnIds: ["c1"], unique: false,
  ...overrides,
});

describe("addIndex", () => {
  it("adds index to document", () => {
    const doc = addIndex(base(), idx());
    expect(doc.indexes).toHaveLength(1);
    expect(doc.indexes[0]).toEqual(idx());
  });

  it("does not mutate original", () => {
    const original = base();
    addIndex(original, idx());
    expect(original.indexes).toHaveLength(0);
  });
});

describe("removeIndex", () => {
  it("removes index by id", () => {
    let doc = addIndex(base(), idx({ id: "i1" }));
    doc = addIndex(doc, idx({ id: "i2", name: "idx_users_name" }));
    doc = removeIndex(doc, "i1");
    expect(doc.indexes).toHaveLength(1);
    expect(doc.indexes[0].id).toBe("i2");
  });

  it("does nothing for unknown id", () => {
    const doc = addIndex(base(), idx());
    expect(removeIndex(doc, "unknown").indexes).toHaveLength(1);
  });
});

describe("updateIndex", () => {
  it("updates specified fields only", () => {
    let doc = addIndex(base(), idx({ id: "i1", unique: false }));
    doc = updateIndex(doc, "i1", { unique: true, name: "uq_users_email" });
    expect(doc.indexes[0].unique).toBe(true);
    expect(doc.indexes[0].name).toBe("uq_users_email");
    expect(doc.indexes[0].columnIds).toEqual(["c1"]);
  });

  it("does not mutate original", () => {
    const doc = addIndex(base(), idx({ id: "i1", unique: false }));
    updateIndex(doc, "i1", { unique: true });
    expect(doc.indexes[0].unique).toBe(false);
  });

  it("does not change the document for unknown id", () => {
    const doc = addIndex(base(), idx({ id: "i1" }));
    const result = updateIndex(doc, "nonexistent", { unique: true });
    expect(result.indexes[0].unique).toBe(false);
  });
});

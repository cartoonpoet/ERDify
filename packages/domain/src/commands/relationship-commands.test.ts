import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "./entity-commands.js";
import { addRelationship, removeRelationship, updateRelationship } from "./relationship-commands.js";
import type { DiagramRelationship } from "../types/index.js";

const rel = (): DiagramRelationship => ({
  id: "r1", name: "fk_orders_users",
  sourceEntityId: "e2", sourceColumnIds: ["c_user_id"],
  targetEntityId: "e1", targetColumnIds: ["c_id"],
  cardinality: "many-to-one", onDelete: "restrict", onUpdate: "no-action",
  identifying: false,
});

const base = () => {
  let doc = createEmptyDiagram({ id: "d1", name: "Test", dialect: "postgresql" });
  doc = addEntity(doc, { id: "e1", name: "users" });
  doc = addEntity(doc, { id: "e2", name: "orders" });
  return doc;
};

describe("addRelationship", () => {
  it("adds relationship to document", () => {
    const doc = addRelationship(base(), rel());
    expect(doc.relationships).toHaveLength(1);
    expect(doc.relationships[0].id).toBe("r1");
  });

  it("does not mutate original", () => {
    const original = base();
    addRelationship(original, rel());
    expect(original.relationships).toHaveLength(0);
  });
});

describe("removeRelationship", () => {
  it("removes the relationship", () => {
    const doc = removeRelationship(addRelationship(base(), rel()), "r1");
    expect(doc.relationships).toHaveLength(0);
  });

  it("leaves other relationships intact", () => {
    let doc = addRelationship(base(), rel());
    doc = addRelationship(doc, { ...rel(), id: "r2", name: "fk2" });
    doc = removeRelationship(doc, "r1");
    expect(doc.relationships).toHaveLength(1);
    expect(doc.relationships[0].id).toBe("r2");
  });
});

describe("updateRelationship", () => {
  it("updates specified fields on the relationship", () => {
    const doc = addRelationship(base(), rel());
    const updated = updateRelationship(doc, "r1", { identifying: true, cardinality: "one-to-one" });
    expect(updated.relationships[0].identifying).toBe(true);
    expect(updated.relationships[0].cardinality).toBe("one-to-one");
    expect(updated.relationships[0].name).toBe("fk_orders_users");
  });

  it("does not mutate original", () => {
    const doc = addRelationship(base(), rel());
    updateRelationship(doc, "r1", { identifying: true });
    expect(doc.relationships[0].identifying).toBe(false);
  });

  it("ignores unknown id", () => {
    const doc = addRelationship(base(), rel());
    const result = updateRelationship(doc, "nonexistent", { identifying: true });
    expect(result.relationships[0].identifying).toBe(false);
  });
});

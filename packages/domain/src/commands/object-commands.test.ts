import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addObject, removeObject, updateObject } from "./object-commands.js";
import type { DiagramDocument, DiagramObject } from "../types/index.js";

const base = () =>
  createEmptyDiagram({ id: "d1", name: "Test", dialect: "postgresql" });

const obj = (overrides: Partial<DiagramObject> = {}): DiagramObject => ({
  id: "o1",
  kind: "procedure",
  name: "sp_get_users",
  sql: "CREATE PROCEDURE sp_get_users() BEGIN SELECT 1; END",
  ...overrides,
});

describe("addObject", () => {
  it("adds object to document", () => {
    const doc = addObject(base(), obj());
    expect(doc.objects).toHaveLength(1);
    expect(doc.objects?.[0]).toEqual(obj());
  });

  it("does not mutate original", () => {
    const original = base();
    addObject(original, obj());
    expect(original.objects).toHaveLength(0);
  });

  it("works on a document without objects field (undefined)", () => {
    const { objects, ...rest } = base();
    void objects;
    const doc = addObject(rest as DiagramDocument, obj());
    expect(doc.objects).toHaveLength(1);
    expect(doc.objects?.[0]).toEqual(obj());
  });
});

describe("updateObject", () => {
  it("updates specified fields only, keeping id immutable", () => {
    let doc = addObject(base(), obj({ id: "o1", name: "sp_a" }));
    doc = addObject(doc, obj({ id: "o2", name: "sp_b" }));
    doc = updateObject(doc, "o1", { name: "sp_renamed", kind: "function" });
    expect(doc.objects?.[0].id).toBe("o1");
    expect(doc.objects?.[0].name).toBe("sp_renamed");
    expect(doc.objects?.[0].kind).toBe("function");
    expect(doc.objects?.[1].name).toBe("sp_b");
  });

  it("does not mutate original", () => {
    const doc = addObject(base(), obj({ id: "o1", name: "sp_a" }));
    updateObject(doc, "o1", { name: "sp_changed" });
    expect(doc.objects?.[0].name).toBe("sp_a");
  });

  it("does nothing for unknown id", () => {
    const doc = addObject(base(), obj({ id: "o1", name: "sp_a" }));
    const result = updateObject(doc, "nonexistent", { name: "sp_x" });
    expect(result.objects?.[0].name).toBe("sp_a");
  });

  it("works on a document without objects field (undefined)", () => {
    const { objects, ...rest } = base();
    void objects;
    const result = updateObject(rest as DiagramDocument, "o1", {
      name: "sp_x",
    });
    expect(result.objects).toEqual([]);
  });
});

describe("removeObject", () => {
  it("removes object by id", () => {
    let doc = addObject(base(), obj({ id: "o1" }));
    doc = addObject(doc, obj({ id: "o2", name: "sp_b" }));
    doc = removeObject(doc, "o1");
    expect(doc.objects).toHaveLength(1);
    expect(doc.objects?.[0].id).toBe("o2");
  });

  it("does nothing for unknown id", () => {
    const doc = addObject(base(), obj());
    expect(removeObject(doc, "unknown").objects).toHaveLength(1);
  });

  it("works on a document without objects field (undefined)", () => {
    const { objects, ...rest } = base();
    void objects;
    const result = removeObject(rest as DiagramDocument, "o1");
    expect(result.objects).toEqual([]);
  });
});

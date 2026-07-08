import { describe, expect, it } from "vitest";
import { addObject, createEmptyDiagram, validateDiagram } from "../index.js";
import type { DiagramDocument } from "../index.js";

describe("canonical ERD document", () => {
  it("creates a valid empty PostgreSQL diagram", () => {
    const diagram = createEmptyDiagram({
      id: "diagram_1",
      name: "Legal ERD",
      dialect: "postgresql"
    });

    expect(validateDiagram(diagram)).toEqual({ valid: true, errors: [] });
    expect(diagram.format).toBe("erdify.schema.v1");
    expect(diagram.entities).toEqual([]);
    expect(diagram.metadata.stableObjectIds).toBe(true);
  });

  it("rejects a relationship that references a missing entity", () => {
    const diagram = createEmptyDiagram({
      id: "diagram_1",
      name: "Legal ERD",
      dialect: "mysql"
    });

    diagram.relationships.push({
      id: "rel_missing",
      name: "fk_missing",
      sourceEntityId: "ent_missing",
      sourceColumnIds: ["col_missing"],
      targetEntityId: "ent_target",
      targetColumnIds: ["col_target"],
      cardinality: "many-to-one",
      onDelete: "restrict",
      onUpdate: "cascade",
      identifying: false,
    });

    expect(validateDiagram(diagram)).toEqual({
      valid: false,
      errors: [
        "Relationship rel_missing references missing source entity ent_missing.",
        "Relationship rel_missing references missing target entity ent_target."
      ]
    });
  });
});

describe("validateDiagram — additional cases", () => {
  it("diagram with no entities and no relationships passes", () => {
    const diagram = createEmptyDiagram({ id: "d1", name: "Empty", dialect: "postgresql" });
    expect(validateDiagram(diagram)).toEqual({ valid: true, errors: [] });
  });

  it("valid diagram with entities and a valid relationship passes", () => {
    const diagram = createEmptyDiagram({ id: "d1", name: "Simple ERD", dialect: "postgresql" });
    diagram.entities.push(
      { id: "ent_users", name: "users", logicalName: null, comment: null, color: null, columns: [] },
      { id: "ent_orders", name: "orders", logicalName: null, comment: null, color: null, columns: [] }
    );
    diagram.relationships.push({
      id: "rel_1",
      name: "fk_user_id",
      sourceEntityId: "ent_orders",
      sourceColumnIds: ["col_user_id"],
      targetEntityId: "ent_users",
      targetColumnIds: ["col_id"],
      cardinality: "many-to-one",
      onDelete: "restrict",
      onUpdate: "no-action",
      identifying: false,
    });

    expect(validateDiagram(diagram)).toEqual({ valid: true, errors: [] });
  });

  it("rejects diagram with wrong format string", () => {
    const diagram = createEmptyDiagram({ id: "d1", name: "Bad Format", dialect: "mysql" });
    // Force an invalid format to test the format check
    (diagram as unknown as { format: string }).format = "erdify.schema.v0";

    const result = validateDiagram(diagram as DiagramDocument);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Diagram format must be erdify.schema.v1.");
  });

  it("relationship referencing only missing source entity produces one error", () => {
    const diagram = createEmptyDiagram({ id: "d1", name: "ERD", dialect: "postgresql" });
    diagram.entities.push({ id: "ent_real", name: "real_table", logicalName: null, comment: null, color: null, columns: [] });

    diagram.relationships.push({
      id: "rel_partial",
      name: "fk_partial",
      sourceEntityId: "ent_ghost",
      sourceColumnIds: [],
      targetEntityId: "ent_real",
      targetColumnIds: [],
      cardinality: "one-to-many",
      onDelete: "cascade",
      onUpdate: "cascade",
      identifying: false,
    });

    const result = validateDiagram(diagram);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("ent_ghost");
  });

  it("relationship referencing only missing target entity produces one error", () => {
    const diagram = createEmptyDiagram({ id: "d1", name: "ERD", dialect: "postgresql" });
    diagram.entities.push({ id: "ent_real", name: "real_table", logicalName: null, comment: null, color: null, columns: [] });

    diagram.relationships.push({
      id: "rel_partial",
      name: "fk_partial",
      sourceEntityId: "ent_real",
      sourceColumnIds: [],
      targetEntityId: "ent_ghost",
      targetColumnIds: [],
      cardinality: "one-to-many",
      onDelete: "cascade",
      onUpdate: "cascade",
      identifying: false,
    });

    const result = validateDiagram(diagram);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("ent_ghost");
  });

  it("self-referencing relationship (same source and target entity) passes — both IDs exist", () => {
    const diagram = createEmptyDiagram({ id: "d1", name: "Self Ref", dialect: "postgresql" });
    diagram.entities.push({ id: "ent_categories", name: "categories", logicalName: null, comment: null, color: null, columns: [] });

    diagram.relationships.push({
      id: "rel_self",
      name: "fk_parent_id",
      sourceEntityId: "ent_categories",
      sourceColumnIds: ["col_parent_id"],
      targetEntityId: "ent_categories",
      targetColumnIds: ["col_id"],
      cardinality: "many-to-one",
      onDelete: "set-null",
      onUpdate: "cascade",
      identifying: false,
    });

    expect(validateDiagram(diagram)).toEqual({ valid: true, errors: [] });
  });

  it("multiple invalid relationships accumulate all errors", () => {
    const diagram = createEmptyDiagram({ id: "d1", name: "Many Errors", dialect: "mssql" });

    diagram.relationships.push(
      {
        id: "rel_a",
        name: "fk_a",
        sourceEntityId: "ghost_a",
        sourceColumnIds: [],
        targetEntityId: "ghost_b",
        targetColumnIds: [],
        cardinality: "one-to-one",
        onDelete: "no-action",
        onUpdate: "no-action",
        identifying: false,
      },
      {
        id: "rel_b",
        name: "fk_b",
        sourceEntityId: "ghost_c",
        sourceColumnIds: [],
        targetEntityId: "ghost_d",
        targetColumnIds: [],
        cardinality: "one-to-many",
        onDelete: "no-action",
        onUpdate: "no-action",
        identifying: false,
      }
    );

    const result = validateDiagram(diagram);
    expect(result.valid).toBe(false);
    // 4 errors: 2 relationships × 2 missing entities each
    expect(result.errors).toHaveLength(4);
  });

  it("diagram with entities but no relationships passes", () => {
    const diagram = createEmptyDiagram({ id: "d1", name: "Only Tables", dialect: "mariadb" });
    diagram.entities.push(
      { id: "ent_a", name: "table_a", logicalName: null, comment: null, color: null, columns: [] },
      { id: "ent_b", name: "table_b", logicalName: null, comment: null, color: null, columns: [] }
    );

    expect(validateDiagram(diagram)).toEqual({ valid: true, errors: [] });
  });
});

describe("validateDiagram — objects", () => {
  const base = () => createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });

  it("flags an object with empty sql", () => {
    const doc = addObject(base(), { id: "o1", kind: "function", name: "f1", sql: "   " });
    const result = validateDiagram(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("f1"))).toBe(true);
  });

  it("flags duplicate object names", () => {
    let doc = addObject(base(), { id: "o1", kind: "view", name: "dup", sql: "CREATE VIEW dup AS SELECT 1;" });
    doc = addObject(doc, { id: "o2", kind: "procedure", name: "dup", sql: "CREATE PROCEDURE dup() AS $$ $$;" });
    const result = validateDiagram(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("dup"))).toBe(true);
  });

  it("accepts well-formed objects", () => {
    const doc = addObject(base(), { id: "o1", kind: "view", name: "ok", sql: "CREATE VIEW ok AS SELECT 1;" });
    expect(validateDiagram(doc).valid).toBe(true);
  });
});

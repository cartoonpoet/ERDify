import { describe, expect, it } from "vitest";
import { createEmptyDiagram, validateDiagram } from "../index";

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
      onUpdate: "cascade"
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

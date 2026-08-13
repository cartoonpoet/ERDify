import { describe, expect, it } from "vitest";
import { createEmptyDiagram, analyzeSchema } from "../index.js";
import type { DiagramColumn, DiagramDocument, DiagramEntity } from "../index.js";

let seq = 0;
function col(partial: Partial<DiagramColumn> & { name: string; type: string }): DiagramColumn {
  return {
    id: partial.id ?? `col_${seq++}`,
    name: partial.name,
    type: partial.type,
    nullable: partial.nullable ?? true,
    primaryKey: partial.primaryKey ?? false,
    unique: partial.unique ?? false,
    defaultValue: partial.defaultValue ?? null,
    comment: partial.comment ?? null,
    ordinal: partial.ordinal ?? 0,
  };
}

function entity(id: string, name: string, columns: DiagramColumn[]): DiagramEntity {
  return { id, name, logicalName: null, comment: null, color: null, columns };
}

function docWith(entities: DiagramEntity[]): DiagramDocument {
  const d = createEmptyDiagram({ id: "d1", name: "t", dialect: "postgresql" });
  d.entities = entities;
  return d;
}

describe("analyzeSchema", () => {
  it("flags a table with no primary key", () => {
    const d = docWith([entity("e1", "users", [col({ name: "email", type: "varchar" })])]);
    const findings = analyzeSchema(d);
    expect(findings.some((f) => f.kind === "missing_pk" && f.table === "users")).toBe(true);
  });

  it("does not flag missing_pk when a PK column exists", () => {
    const d = docWith([entity("e1", "users", [col({ name: "id", type: "uuid", primaryKey: true, nullable: false })])]);
    expect(analyzeSchema(d).some((f) => f.kind === "missing_pk")).toBe(false);
  });

  it("flags a nullable primary key", () => {
    const d = docWith([entity("e1", "users", [col({ name: "id", type: "uuid", primaryKey: true, nullable: true })])]);
    expect(analyzeSchema(d).some((f) => f.kind === "nullable_pk" && f.table === "users")).toBe(true);
  });

  it("flags an FK column without an index", () => {
    const fk = col({ id: "c_fk", name: "user_id", type: "uuid", nullable: false });
    const d = docWith([
      entity("e1", "users", [col({ name: "id", type: "uuid", primaryKey: true, nullable: false })]),
      entity("e2", "orders", [col({ name: "id", type: "uuid", primaryKey: true, nullable: false }), fk]),
    ]);
    d.relationships = [
      {
        id: "r1", name: "", sourceEntityId: "e2", sourceColumnIds: ["c_fk"],
        targetEntityId: "e1", targetColumnIds: [], cardinality: "many-to-one",
        onDelete: "no-action", onUpdate: "no-action", identifying: false,
      },
    ];
    const findings = analyzeSchema(d);
    expect(findings.some((f) => f.kind === "fk_without_index" && f.table === "orders")).toBe(true);
  });

  it("does not flag fk_without_index when the FK column is indexed", () => {
    const fk = col({ id: "c_fk", name: "user_id", type: "uuid", nullable: false });
    const d = docWith([
      entity("e1", "users", [col({ name: "id", type: "uuid", primaryKey: true, nullable: false })]),
      entity("e2", "orders", [fk]),
    ]);
    d.relationships = [
      { id: "r1", name: "", sourceEntityId: "e2", sourceColumnIds: ["c_fk"], targetEntityId: "e1", targetColumnIds: [], cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false },
    ];
    d.indexes = [{ id: "i1", entityId: "e2", name: "idx_orders_user_id", columnIds: ["c_fk"], unique: false }];
    expect(analyzeSchema(d).some((f) => f.kind === "fk_without_index")).toBe(false);
  });

  it("flags the same column name defined with different types", () => {
    const d = docWith([
      entity("e1", "orders", [col({ name: "user_id", type: "uuid" })]),
      entity("e2", "carts", [col({ name: "user_id", type: "bigint" })]),
    ]);
    const f = analyzeSchema(d).find((x) => x.kind === "type_mismatch");
    expect(f).toBeDefined();
    expect(f!.detail).toContain("user_id");
  });

  it("flags naming case inconsistency (snake + camel) but ignores single-word names", () => {
    const d = docWith([
      entity("e1", "users", [
        col({ name: "id", type: "uuid" }), // ambiguous, ignored
        col({ name: "created_at", type: "timestamptz" }), // snake
        col({ name: "userName", type: "varchar" }), // camel
      ]),
    ]);
    expect(analyzeSchema(d).some((f) => f.kind === "naming_inconsistency")).toBe(true);
  });

  it("does not flag naming inconsistency for a fully snake_case schema", () => {
    const d = docWith([
      entity("e1", "users", [col({ name: "id", type: "uuid" }), col({ name: "created_at", type: "timestamptz" }), col({ name: "full_name", type: "varchar" })]),
    ]);
    expect(analyzeSchema(d).some((f) => f.kind === "naming_inconsistency")).toBe(false);
  });

  it("flags a repeating column group (normalization candidate)", () => {
    const d = docWith([
      entity("e1", "contacts", [col({ name: "phone1", type: "varchar" }), col({ name: "phone2", type: "varchar" })]),
    ]);
    const f = analyzeSchema(d).find((x) => x.kind === "repeating_group");
    expect(f).toBeDefined();
    expect(f!.table).toBe("contacts");
  });

  it("returns no findings for a clean schema", () => {
    const d = docWith([
      entity("e1", "users", [
        col({ name: "id", type: "uuid", primaryKey: true, nullable: false }),
        col({ name: "email", type: "varchar", nullable: false }),
      ]),
    ]);
    expect(analyzeSchema(d)).toEqual([]);
  });

  it("flags a repeating column group with underscore suffixes (phone_1, phone_2)", () => {
    const d = docWith([
      entity("e1", "contacts", [col({ name: "phone_1", type: "varchar" }), col({ name: "phone_2", type: "varchar" })]),
    ]);
    const f = analyzeSchema(d).find((x) => x.kind === "repeating_group");
    expect(f).toBeDefined();
    expect(f!.detail).toContain("phone");
  });

  it("reports snake as the minority style when camel is dominant", () => {
    const d = docWith([
      entity("e1", "users", [
        col({ name: "userName", type: "varchar" }),
        col({ name: "userEmail", type: "varchar" }),
        col({ name: "created_at", type: "timestamptz" }),
      ]),
    ]);
    const f = analyzeSchema(d).find((x) => x.kind === "naming_inconsistency");
    expect(f).toBeDefined();
    expect(f!.detail).toContain("소수 스타일(snake)");
    expect(f!.detail).toContain("users.created_at");
  });

  it("ignores relationships pointing at missing entities or columns", () => {
    const d = docWith([entity("e1", "users", [col({ id: "c1", name: "id", type: "uuid", primaryKey: true, nullable: false })])]);
    d.relationships = [
      { id: "r1", name: "", sourceEntityId: "ghost", sourceColumnIds: ["c1"], targetEntityId: "e1", targetColumnIds: [], cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false },
      { id: "r2", name: "", sourceEntityId: "e1", sourceColumnIds: ["ghost_col"], targetEntityId: "e1", targetColumnIds: [], cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false },
    ];
    expect(analyzeSchema(d).some((f) => f.kind === "fk_without_index")).toBe(false);
  });

  // MAX_FINDINGS 절단 때문에 블록 간 순서가 곧 "어떤 finding이 살아남는지"를 결정한다.
  // 리팩터링으로 블록을 분리하더라도 이 순서는 바이트 단위로 보존되어야 한다.
  it("keeps the finding order: pk issues → fk index → type mismatch → naming → repeating groups", () => {
    const fk = col({ id: "c_fk", name: "user_id", type: "uuid", nullable: false });
    const d = docWith([
      entity("e1", "users", [
        col({ name: "id", type: "uuid", primaryKey: true, nullable: true }),
        col({ name: "user_id", type: "bigint" }),
        col({ name: "userName", type: "varchar" }),
        col({ name: "addr1", type: "varchar" }),
        col({ name: "addr2", type: "varchar" }),
      ]),
      entity("e2", "orders", [fk]),
    ]);
    d.relationships = [
      { id: "r1", name: "", sourceEntityId: "e2", sourceColumnIds: ["c_fk"], targetEntityId: "e1", targetColumnIds: [], cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false },
    ];
    expect(analyzeSchema(d).map((f) => f.kind)).toEqual([
      "nullable_pk",
      "missing_pk",
      "fk_without_index",
      "type_mismatch",
      "naming_inconsistency",
      "repeating_group",
    ]);
  });
});

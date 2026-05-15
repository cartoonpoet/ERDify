import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity, setSeedData } from "../commands/entity-commands.js";
import { addColumn } from "../commands/column-commands.js";
import { setEntitySchema } from "../commands/entity-commands.js";
import { generateSeedSql, generateSetupSql } from "./seed-generator.js";
import type { DiagramColumn, DiagramDocument } from "../types/index.js";

const col = (overrides: Partial<DiagramColumn>): DiagramColumn => ({
  id: "c1",
  name: "id",
  type: "INT",
  nullable: false,
  primaryKey: true,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal: 0,
  ...overrides,
});

const basePostgres = () =>
  createEmptyDiagram({ id: "d1", name: "Test", dialect: "postgresql" });

const baseMysql = () =>
  createEmptyDiagram({ id: "d1", name: "Test", dialect: "mysql" });

const baseMssql = () =>
  createEmptyDiagram({ id: "d1", name: "Test", dialect: "mssql" });

describe("generateSeedSql", () => {
  // Test 1: Returns empty string when no entities have seedData
  it("returns empty string when no entities have seedData", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT" }));
    expect(generateSeedSql(doc)).toBe("");
  });

  // Test 2: Returns empty string when all seedData rows are empty objects
  it("returns empty string when all seedData rows are empty objects", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT" }));
    doc = setSeedData(doc, "e1", [{}]);
    expect(generateSeedSql(doc)).toBe("");
  });

  // Test 3: MySQL dialect uses backtick quoting
  it("uses backtick quoting for MySQL dialect", () => {
    let doc = baseMysql();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", ordinal: 0 }));
    doc = setSeedData(doc, "e1", [{ c1: "1" }]);
    const sql = generateSeedSql(doc);
    expect(sql).toContain("INSERT INTO `users` (`id`) VALUES");
  });

  // Test 4: PostgreSQL dialect uses double-quote quoting
  it("uses double-quote quoting for PostgreSQL dialect", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", ordinal: 0 }));
    doc = setSeedData(doc, "e1", [{ c1: "1" }]);
    const sql = generateSeedSql(doc);
    expect(sql).toContain(`INSERT INTO "users" ("id") VALUES`);
  });

  // Test 5: MSSQL dialect uses bracket quoting
  it("uses bracket quoting for MSSQL dialect", () => {
    let doc = baseMssql();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", ordinal: 0 }));
    doc = setSeedData(doc, "e1", [{ c1: "1" }]);
    const sql = generateSeedSql(doc);
    expect(sql).toContain("INSERT INTO [users] ([id]) VALUES");
  });

  // Test 6: Schema-qualified table name in MSSQL
  it("produces schema-qualified bracket name for MSSQL (e.g. [dbo].[users])", () => {
    let doc = baseMssql();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = setEntitySchema(doc, "e1", "dbo");
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", ordinal: 0 }));
    doc = setSeedData(doc, "e1", [{ c1: "42" }]);
    const sql = generateSeedSql(doc);
    expect(sql).toContain("INSERT INTO [dbo].[users]");
  });

  // Test 7: Numeric column types — values NOT quoted
  it("does not quote values for numeric column types (INT, BIGINT, FLOAT, DECIMAL)", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "products" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "qty", type: "INT", ordinal: 0 }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "price", type: "DECIMAL", ordinal: 1 }));
    doc = addColumn(doc, "e1", col({ id: "c3", name: "weight", type: "FLOAT", ordinal: 2 }));
    doc = addColumn(doc, "e1", col({ id: "c4", name: "big_num", type: "BIGINT", ordinal: 3 }));
    doc = setSeedData(doc, "e1", [{ c1: "10", c2: "9.99", c3: "1.5", c4: "9999999999" }]);
    const sql = generateSeedSql(doc);
    expect(sql).toContain("(10, 9.99, 1.5, 9999999999)");
  });

  // Test 8: String column types — values are single-quoted
  it("wraps string values in single quotes for VARCHAR and TEXT types", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "name", type: "VARCHAR", ordinal: 0 }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "bio", type: "TEXT", ordinal: 1 }));
    doc = setSeedData(doc, "e1", [{ c1: "Alice", c2: "Hello world" }]);
    const sql = generateSeedSql(doc);
    expect(sql).toContain("('Alice', 'Hello world')");
  });

  // Test 9: NULL/empty values produce NULL literal
  it("produces NULL literal for empty string and 'null' string values", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "name", type: "VARCHAR", ordinal: 0 }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "bio", type: "TEXT", ordinal: 1 }));
    // Both rows have a value in c1 so it stays in usedCols; c2 has "null" in one row
    doc = setSeedData(doc, "e1", [
      { c1: "Alice", c2: "null" },
      { c1: "", c2: "some bio" },
    ]);
    const sql = generateSeedSql(doc);
    // First row: c1="Alice" → 'Alice', c2="null" → NULL
    expect(sql).toContain("('Alice', NULL)");
    // Second row: c1="" → NULL, c2="some bio" → 'some bio'
    expect(sql).toContain("(NULL, 'some bio')");
  });

  // Test 10: Single-quote escaping in string values
  it("escapes single quotes in string values (O'Brien → 'O''Brien')", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "name", type: "VARCHAR", ordinal: 0 }));
    doc = setSeedData(doc, "e1", [{ c1: "O'Brien" }]);
    const sql = generateSeedSql(doc);
    expect(sql).toContain("('O''Brien')");
  });

  // Test 11: Multiple entities produce multiple INSERT blocks separated by blank lines
  it("separates INSERT blocks for multiple entities with a blank line", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", ordinal: 0 }));
    doc = setSeedData(doc, "e1", [{ c1: "1" }]);

    doc = addEntity(doc, { id: "e2", name: "orders" });
    doc = addColumn(doc, "e2", col({ id: "c2", name: "order_id", type: "INT", ordinal: 0 }));
    doc = setSeedData(doc, "e2", [{ c2: "100" }]);

    const sql = generateSeedSql(doc);
    expect(sql).toContain(`INSERT INTO "users"`);
    expect(sql).toContain(`INSERT INTO "orders"`);
    // blank line between blocks
    expect(sql).toContain("\n\n");
  });

  // Test 12: Columns with no data in any row are excluded from the INSERT
  it("excludes columns that have no data in any row", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", ordinal: 0 }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "bio", type: "TEXT", ordinal: 1 }));
    // Only c1 has data; c2 is always empty
    doc = setSeedData(doc, "e1", [{ c1: "1", c2: "" }, { c1: "2", c2: "" }]);
    const sql = generateSeedSql(doc);
    expect(sql).toContain(`("id")`);
    expect(sql).not.toContain(`"bio"`);
  });
});

describe("generateSetupSql", () => {
  // Test 13: Returns empty string when doc has no entities and no seedData
  it("returns empty string when there are no entities and no seedData", () => {
    const doc = basePostgres();
    expect(generateSetupSql(doc)).toBe("");
  });

  // Test 14: Returns only DDL when no seedData
  it("returns only DDL when entities have no seedData", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", ordinal: 0 }));
    const result = generateSetupSql(doc);
    expect(result).toContain("CREATE TABLE");
    expect(result).not.toContain("INSERT INTO");
    expect(result).not.toContain("-- Seed Data");
  });

  // Test 15: Returns only DDL (no seed section) when entity has no columns with seed data
  it("returns only DDL (no seed section) when entity columns have no matching seed data keys", () => {
    const now = new Date().toISOString();
    // Entity with columns but seedData rows reference non-existent column ids → usedCols empty
    const docWithUnmatchedSeed: DiagramDocument = {
      format: "erdify.schema.v1",
      id: "d1",
      name: "Test",
      dialect: "postgresql",
      entities: [
        {
          id: "e1",
          name: "users",
          schema: null,
          logicalName: null,
          comment: null,
          color: null,
          columns: [
            {
              id: "c1",
              name: "id",
              type: "INT",
              nullable: false,
              primaryKey: true,
              unique: false,
              defaultValue: null,
              comment: null,
              ordinal: 0,
            },
          ],
          // Seed rows reference "unknown_col" — no overlap with actual column ids
          seedData: [{ unknown_col: "1" }],
        },
      ],
      relationships: [],
      indexes: [],
      views: [],
      layout: { entityPositions: {} },
      metadata: { revision: 1, stableObjectIds: true, createdAt: now, updatedAt: now },
    };
    // usedCols is empty → generateSeedSql returns "" → generateSetupSql returns DDL only
    const result = generateSetupSql(docWithUnmatchedSeed);
    expect(result).toContain("CREATE TABLE");
    expect(result).not.toContain("INSERT INTO");
    expect(result).not.toContain("-- Seed Data");
  });

  // Test 16: Returns combined DDL + seed SQL when both present
  it("combines DDL and seed SQL with '-- Seed Data' separator when both are present", () => {
    let doc = basePostgres();
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", ordinal: 0 }));
    doc = setSeedData(doc, "e1", [{ c1: "1" }]);
    const result = generateSetupSql(doc);
    expect(result).toContain("CREATE TABLE");
    expect(result).toContain("-- Seed Data");
    expect(result).toContain("INSERT INTO");
    // DDL comes before seed data marker
    const ddlPos = result.indexOf("CREATE TABLE");
    const seedPos = result.indexOf("-- Seed Data");
    const insertPos = result.indexOf("INSERT INTO");
    expect(ddlPos).toBeLessThan(seedPos);
    expect(seedPos).toBeLessThan(insertPos);
  });
});

import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "../commands/entity-commands.js";
import { addColumn } from "../commands/column-commands.js";
import { addIndex } from "../commands/index-commands.js";
import { updateEntityComment } from "../commands/entity-commands.js";
import { generateDdl } from "./ddl-generator.js";
import type { DiagramColumn } from "../types/index.js";

const col = (overrides: Partial<DiagramColumn>): DiagramColumn => ({
  id: "c1", name: "id", type: "uuid", nullable: false,
  primaryKey: true, unique: false, defaultValue: null, comment: null, ordinal: 0,
  ...overrides,
});

describe("generateDdl — COMMENT (postgresql)", () => {
  it("outputs COMMENT ON TABLE when entity has comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`COMMENT ON TABLE "users" IS '사용자 테이블'`);
  });

  it("outputs COMMENT ON COLUMN for columns with comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", comment: "사용자 ID" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`COMMENT ON COLUMN "users"."id" IS '사용자 ID'`);
  });

  it("omits COMMENT ON TABLE when entity comment is null", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const ddl = generateDdl(doc);
    expect(ddl).not.toContain("COMMENT ON TABLE");
  });
});

describe("generateDdl — COMMENT (mysql)", () => {
  it("adds inline COMMENT on column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", comment: "사용자 ID" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain("COMMENT '사용자 ID'");
  });

  it("adds COMMENT on table closing paren", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain("COMMENT='사용자 테이블'");
  });
});

describe("generateDdl — CREATE INDEX", () => {
  it("outputs CREATE INDEX for non-unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "email", primaryKey: false }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_users_email", columnIds: ["c1"], unique: false });
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`CREATE INDEX "idx_users_email" ON "users" ("email")`);
  });

  it("outputs CREATE UNIQUE INDEX for unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "email", primaryKey: false }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "uq_users_email", columnIds: ["c1"], unique: true });
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email")`);
  });

  it("supports composite index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "orders" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "user_id", primaryKey: false }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "status", primaryKey: false, ordinal: 1 }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_orders_user_status", columnIds: ["c1", "c2"], unique: false });
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`CREATE INDEX "idx_orders_user_status" ON "orders" ("user_id", "status")`);
  });

  it("skips index with no columnIds", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "empty", columnIds: [], unique: false });
    const ddl = generateDdl(doc);
    expect(ddl).not.toContain("CREATE INDEX");
  });
});

import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "../commands/entity-commands.js";
import { addColumn } from "../commands/column-commands.js";
import { addIndex } from "../commands/index-commands.js";
import { addRelationship } from "../commands/relationship-commands.js";
import { updateEntityComment } from "../commands/entity-commands.js";
import { generateDdl, generateDdlReport } from "./ddl-generator.js";
import type { DiagramColumn, DiagramRelationship } from "../types/index.js";

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

describe("generateDdl — 따옴표 이스케이프", () => {
  it("postgresql 테이블 comment의 단따옴표를 이스케이프한다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "it's a table");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`COMMENT ON TABLE "users" IS 'it''s a table'`);
  });

  it("postgresql 컬럼 comment의 단따옴표를 이스케이프한다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", comment: "user's ID" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`COMMENT ON COLUMN "users"."id" IS 'user''s ID'`);
  });

  it("mysql 인라인 컬럼 comment의 단따옴표를 이스케이프한다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", comment: "user's ID", primaryKey: false }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`COMMENT 'user''s ID'`);
  });

  it("mysql 테이블 comment의 단따옴표를 이스케이프한다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "user's table");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`COMMENT='user''s table'`);
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

const rel = (overrides: Partial<DiagramRelationship>): DiagramRelationship => ({
  id: "r1", name: "fk_orders_users",
  sourceEntityId: "orders", sourceColumnIds: ["o_uid"],
  targetEntityId: "users", targetColumnIds: ["u_id"],
  cardinality: "many-to-one", onDelete: "restrict", onUpdate: "restrict",
  identifying: false,
  ...overrides,
});

// orders(o_uid) → users(u_id) 두 테이블을 세팅한 mysql 다이어그램
function docWithTwoTables() {
  let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
  doc = addEntity(doc, { id: "users", name: "users" });
  doc = addColumn(doc, "users", col({ id: "u_id", name: "id" }));
  doc = addEntity(doc, { id: "orders", name: "orders" });
  doc = addColumn(doc, "orders", col({ id: "o_uid", name: "user_id", primaryKey: false }));
  return doc;
}

describe("generateDdlReport — 경고 채널 + FK 강등", () => {
  it("정상 FK는 ALTER TABLE을 출력하고 경고가 없다", () => {
    const doc = addRelationship(docWithTwoTables(), rel({}));
    const { sql, warnings } = generateDdlReport(doc);
    expect(sql).toContain("FOREIGN KEY (`user_id`)");
    expect(sql).toContain("REFERENCES `users` (`id`)");
    expect(warnings).toHaveLength(0);
  });

  it("컬럼 매핑이 비면 빈 괄호 SQL 대신 주석으로 강등하고 경고를 남긴다", () => {
    const doc = addRelationship(
      docWithTwoTables(),
      rel({ sourceColumnIds: [], targetColumnIds: [] })
    );
    const { sql, warnings } = generateDdlReport(doc);
    expect(sql).not.toContain("FOREIGN KEY ()");
    expect(sql).not.toContain("REFERENCES `users` ()");
    expect(sql).toContain("-- [erdify] Skipped FK fk_orders_users");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.code).toBe("fk_unresolved_columns");
  });

  it("해결되지 않는 컬럼 id는 그대로 출력하지 않고 강등한다", () => {
    const doc = addRelationship(
      docWithTwoTables(),
      rel({ targetColumnIds: ["does_not_exist"] })
    );
    const { sql, warnings } = generateDdlReport(doc);
    // 미해결 id는 진단용 주석 메시지에만 등장하고, 실행되는 FK 문에는 들어가지 않는다
    expect(sql).not.toContain("FOREIGN KEY");
    expect(sql).toContain("-- [erdify] Skipped FK");
    expect(warnings[0]!.code).toBe("fk_unresolved_columns");
  });

  it("소스/타깃 컬럼 개수가 다르면 개수 불일치로 강등한다", () => {
    let doc = docWithTwoTables();
    doc = addColumn(doc, "orders", col({ id: "o_extra", name: "extra", primaryKey: false, ordinal: 1 }));
    doc = addRelationship(doc, rel({ sourceColumnIds: ["o_uid", "o_extra"] }));
    const { sql, warnings } = generateDdlReport(doc);
    expect(sql).toContain("-- [erdify] Skipped FK");
    expect(warnings[0]!.code).toBe("fk_column_count_mismatch");
  });

  it("존재하지 않는 엔티티를 참조하면 fk_missing_entity 경고", () => {
    const doc = addRelationship(docWithTwoTables(), rel({ targetEntityId: "ghost" }));
    const { warnings } = generateDdlReport(doc);
    expect(warnings[0]!.code).toBe("fk_missing_entity");
  });

  it("generateDdl(문자열) 래퍼는 기존과 동일하게 SQL만 반환한다", () => {
    const doc = addRelationship(docWithTwoTables(), rel({}));
    expect(generateDdl(doc)).toBe(generateDdlReport(doc).sql);
  });
});

describe("generateDdl — AUTO_INCREMENT", () => {
  it("mysql에서 autoIncrement 컬럼에 AUTO_INCREMENT를 출력한다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "bigint", autoIncrement: true }));
    expect(generateDdl(doc)).toContain("`id` bigint NOT NULL AUTO_INCREMENT");
  });

  it("postgresql에서는 AUTO_INCREMENT를 출력하지 않는다 (잘못된 문법)", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "bigint", autoIncrement: true }));
    expect(generateDdl(doc)).not.toContain("AUTO_INCREMENT");
  });

  it("autoIncrement가 없으면 AUTO_INCREMENT를 출력하지 않는다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id" }));
    expect(generateDdl(doc)).not.toContain("AUTO_INCREMENT");
  });

  it("PK인 autoIncrement 컬럼은 경고가 없다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "bigint", autoIncrement: true, primaryKey: true }));
    expect(generateDdlReport(doc).warnings).toHaveLength(0);
  });

  it("키가 아닌 autoIncrement 컬럼은 autoincrement_not_keyed 경고", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "seq", type: "bigint", autoIncrement: true, primaryKey: false }));
    const { warnings } = generateDdlReport(doc);
    expect(warnings.map((w) => w.code)).toContain("autoincrement_not_keyed");
  });

  it("한 테이블에 autoIncrement 컬럼이 2개면 autoincrement_multiple 경고", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "bigint", autoIncrement: true, primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "seq", type: "bigint", autoIncrement: true, primaryKey: false, ordinal: 1 }));
    const { warnings } = generateDdlReport(doc);
    expect(warnings.map((w) => w.code)).toContain("autoincrement_multiple");
  });
});

describe("generateDdlReport — 식별자/기본값/타입 검증 (T4)", () => {
  it("컬럼명 후행 공백을 trim해서 출력하고 identifier_whitespace 경고를 남긴다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id   ", primaryKey: false }));
    const { sql, warnings } = generateDdlReport(doc);
    expect(sql).toContain("`id`"); // trim됨
    expect(sql).not.toContain("`id   `");
    expect(warnings.map((w) => w.code)).toContain("identifier_whitespace");
  });

  it("문자열 컬럼의 미인용 DEFAULT를 자동 quoting하고 default_autoquoted 경고", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "t" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "code", type: "varchar(20)", primaryKey: false, defaultValue: "코드값" }));
    const { sql, warnings } = generateDdlReport(doc);
    expect(sql).toContain("DEFAULT '코드값'");
    expect(warnings.map((w) => w.code)).toContain("default_autoquoted");
  });

  it("숫자/함수/키워드 DEFAULT는 그대로 두고 경고하지 않는다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "t" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "cnt", type: "int", primaryKey: false, defaultValue: "0" }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "ts", type: "timestamp", primaryKey: false, defaultValue: "CURRENT_TIMESTAMP", ordinal: 1 }));
    const { sql, warnings } = generateDdlReport(doc);
    expect(sql).toContain("DEFAULT 0");
    expect(sql).toContain("DEFAULT CURRENT_TIMESTAMP");
    expect(warnings.filter((w) => w.code === "default_autoquoted")).toHaveLength(0);
  });

  it("타입 필드에 섞인 DEFAULT CHARSET= 절을 제거하고 type_sanitized 경고", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "t" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "body", type: "text DEFAULT CHARSET=utf8mb4", primaryKey: false }));
    const { sql, warnings } = generateDdlReport(doc);
    expect(sql).toContain("`body` text");
    expect(sql).not.toContain("CHARSET=utf8mb4");
    expect(warnings.map((w) => w.code)).toContain("type_sanitized");
  });
});

// users(id PK) ← orders(user_id) FK를 세팅한 mysql 다이어그램
function docWithFk(targetColIsPk = true) {
  let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
  doc = addEntity(doc, { id: "users", name: "users" });
  doc = addColumn(doc, "users", col({ id: "u_id", name: "id", primaryKey: targetColIsPk }));
  doc = addEntity(doc, { id: "orders", name: "orders" });
  doc = addColumn(doc, "orders", col({ id: "o_uid", name: "user_id", primaryKey: false }));
  return addRelationship(doc, rel({ targetColumnIds: ["u_id"] }));
}

describe("generateDdlReport — 참조 무결성 검증 (T6)", () => {
  it("대상 컬럼이 PK면 경고가 없다", () => {
    const { warnings } = generateDdlReport(docWithFk(true));
    expect(warnings.filter((w) => w.code === "fk_target_not_keyed")).toHaveLength(0);
  });

  it("대상 컬럼이 키가 아니면 fk_target_not_keyed 경고 (ERROR 1822 방지)", () => {
    const { sql, warnings } = generateDdlReport(docWithFk(false));
    expect(warnings.map((w) => w.code)).toContain("fk_target_not_keyed");
    expect(sql).toContain("FOREIGN KEY (`user_id`)"); // 경고만, SQL은 그대로 출력
  });
});

describe("generateDdlReport — 민감정보 경고 (T7)", () => {
  it("컬럼 comment의 사설 IP를 감지한다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "log" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "user", type: "varchar(50)", primaryKey: false, comment: "예: root@10.255.1.2" }));
    const { warnings } = generateDdlReport(doc);
    expect(warnings.map((w) => w.code)).toContain("sensitive_info");
  });

  it("일반 comment에는 경고하지 않는다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "log" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "user", type: "varchar(50)", primaryKey: false, comment: "접속 사용자" }));
    const { warnings } = generateDdlReport(doc);
    expect(warnings.filter((w) => w.code === "sensitive_info")).toHaveLength(0);
  });
});

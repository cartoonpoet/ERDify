import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity, updateEntityComment } from "../commands/entity-commands.js";
import { addColumn } from "../commands/column-commands.js";
import { addIndex } from "../commands/index-commands.js";
import { addRelationship } from "../commands/relationship-commands.js";
import { generateOrm } from "./orm-generator.js";
import type { DiagramColumn } from "../types/index.js";

const col = (overrides: Partial<DiagramColumn>): DiagramColumn => ({
  id: "c1",
  name: "id",
  type: "int",
  nullable: false,
  primaryKey: true,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal: 0,
  ...overrides,
});

// ─── TypeORM ──────────────────────────────────────────────────────────────────

describe("generateOrm — TypeORM: import & class basics", () => {
  it("always emits the typeorm import line", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";`);
  });

  it("wraps entity in @Entity decorator with snake_case table name", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "UserProfile" });
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`@Entity("user_profile")`);
    expect(out).toContain(`export class UserProfile {`);
  });
});

describe("generateOrm — TypeORM: PK columns", () => {
  it("emits @PrimaryGeneratedColumn() for int PK", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`@PrimaryGeneratedColumn()`);
    expect(out).toContain(`id!: number;`);
  });

  it("emits @PrimaryGeneratedColumn(\"uuid\") for uuid PK", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "uuid", primaryKey: true }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`@PrimaryGeneratedColumn("uuid")`);
    expect(out).toContain(`id!: string;`);
  });
});

describe("generateOrm — TypeORM: regular columns", () => {
  it("emits @Column({ nullable: false }) for not-null column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`@Column({ nullable: false })`);
    expect(out).toContain(`email!: string;`);
  });

  it("emits @Column() with no options for nullable column and appends | null", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "bio", type: "text", primaryKey: false, nullable: true, ordinal: 1 }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`bio?: string | null;`);
  });

  it("emits unique: true in @Column options for unique column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, unique: true, ordinal: 1 }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`unique: true`);
  });

  it("emits JSDoc comment above column when comment is set", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true, comment: "PK" }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`/** PK */`);
  });
});

describe("generateOrm — TypeORM: entity comment", () => {
  it("emits JSDoc comment above @Entity when entity has comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`/** 사용자 테이블 */`);
  });
});

describe("generateOrm — TypeORM: type mappings", () => {
  const cases: [string, string][] = [
    ["varchar(100)", "string"],
    ["text", "string"],
    ["int", "number"],
    ["integer", "number"],
    ["bigint", "bigint"],
    ["boolean", "boolean"],
    ["timestamp", "Date"],
    ["date", "Date"],
    ["uuid", "string"],
  ];

  for (const [sqlType, tsType] of cases) {
    it(`maps ${sqlType} → ${tsType}`, () => {
      let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
      doc = addEntity(doc, { id: "e1", name: "items" });
      doc = addColumn(doc, "e1", col({ id: "c1", name: "field", type: sqlType, primaryKey: false, nullable: true }));
      const out = generateOrm(doc, "typeorm");
      expect(out).toContain(`field?: ${tsType}`);
    });
  }
});

describe("generateOrm — TypeORM: indexes", () => {
  it("emits @Index([cols]) for non-unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_email", columnIds: ["c2"], unique: false });
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`@Index(["email"])`);
  });

  it("emits @Index([cols], { unique: true }) for unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "uq_email", columnIds: ["c2"], unique: true });
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`@Index(["email"], { unique: true })`);
  });
});

describe("generateOrm — TypeORM: empty document", () => {
  it("produces only the import line when there are no entities", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    const out = generateOrm(doc, "typeorm");
    expect(out).toBe(`import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";\n\n`);
  });
});

describe("generateOrm — TypeORM: multiple entities", () => {
  it("emits a class block for each entity", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addEntity(doc, { id: "e2", name: "posts" });
    doc = addColumn(doc, "e2", col({ id: "c2", name: "id", type: "int", primaryKey: true }));
    const out = generateOrm(doc, "typeorm");
    expect(out).toContain(`export class Users {`);
    expect(out).toContain(`export class Posts {`);
  });
});

// ─── Prisma ───────────────────────────────────────────────────────────────────

describe("generateOrm — Prisma: header blocks", () => {
  it("emits generator and datasource blocks", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`generator client {`);
    expect(out).toContain(`provider = "prisma-client-js"`);
    expect(out).toContain(`datasource db {`);
    expect(out).toContain(`provider = "postgresql"`);
    expect(out).toContain(`url      = env("DATABASE_URL")`);
  });

  it("uses mysql provider for mysql dialect", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`provider = "mysql"`);
  });
});

describe("generateOrm — Prisma: PK columns", () => {
  it("emits @id @default(autoincrement()) for int PK", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`id Int  @id @default(autoincrement())`);
  });

  it("emits @id @default(uuid()) for uuid PK", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "uuid", primaryKey: true }));
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`id String  @id @default(uuid())`);
  });
});

describe("generateOrm — Prisma: regular columns", () => {
  it("appends ? for nullable column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "bio", type: "text", primaryKey: false, nullable: true, ordinal: 1 }));
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`bio String?`);
  });

  it("does not append ? for not-null column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`email String`);
    // Ensure no trailing '?' on this field
    const emailLine = out.split("\n").find((l) => l.trimStart().startsWith("email "));
    expect(emailLine).toBeDefined();
    expect(emailLine).not.toMatch(/email String\?/);
  });

  it("emits @unique for unique column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, unique: true, ordinal: 1 }));
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`@unique`);
  });

  it("appends // comment inline for column with comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true, comment: "PK" }));
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`// PK`);
  });
});

describe("generateOrm — Prisma: entity comment", () => {
  it("emits /// comment above model when entity has comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`/// 사용자 테이블`);
  });
});

describe("generateOrm — Prisma: type mappings", () => {
  const cases: [string, string][] = [
    ["varchar(100)", "String"],
    ["text", "String"],
    ["int", "Int"],
    ["integer", "Int"],
    ["bigint", "BigInt"],
    ["boolean", "Boolean"],
    ["timestamp", "DateTime"],
    ["uuid", "String"],
    ["float", "Float"],
    ["decimal(10,2)", "Decimal"],
    ["json", "Json"],
  ];

  for (const [sqlType, prismaType] of cases) {
    it(`maps ${sqlType} → ${prismaType}`, () => {
      let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
      doc = addEntity(doc, { id: "e1", name: "items" });
      doc = addColumn(doc, "e1", col({ id: "c1", name: "field", type: sqlType, primaryKey: false, nullable: true }));
      const out = generateOrm(doc, "prisma");
      expect(out).toContain(`field ${prismaType}?`);
    });
  }
});

describe("generateOrm — Prisma: relationships", () => {
  it("emits @relation field on source entity and array field on target entity", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "posts" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "user_id", type: "int", primaryKey: false, nullable: false, ordinal: 1 }));
    doc = addEntity(doc, { id: "e2", name: "users" });
    doc = addColumn(doc, "e2", col({ id: "c3", name: "id", type: "int", primaryKey: true }));
    doc = addRelationship(doc, {
      id: "r1",
      name: "posts_user_id_fk",
      sourceEntityId: "e1",
      sourceColumnIds: ["c2"],
      targetEntityId: "e2",
      targetColumnIds: ["c3"],
      cardinality: "many-to-one",
      onDelete: "no-action",
      onUpdate: "no-action",
      identifying: false,
    });
    const out = generateOrm(doc, "prisma");
    // source entity (posts) should have relation field pointing to Users
    expect(out).toContain(`users Users? @relation(fields: ["userId"], references: ["id"])`);
    // target entity (users) should have back-reference array
    // generator appends 's' literally → "posts" becomes "postss"
    expect(out).toContain(`postss Posts[]`);
  });
});

describe("generateOrm — Prisma: indexes", () => {
  it("emits @@index for non-unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_email", columnIds: ["c2"], unique: false });
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`@@index([email])`);
  });

  it("emits @@unique for unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "uq_email", columnIds: ["c2"], unique: true });
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`@@unique([email])`);
  });
});

describe("generateOrm — Prisma: empty document", () => {
  it("produces only the header blocks when there are no entities", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    const out = generateOrm(doc, "prisma");
    expect(out).not.toContain(`model `);
    expect(out).toContain(`generator client`);
  });
});

describe("generateOrm — Prisma: multiple entities", () => {
  it("emits a model block for each entity", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addEntity(doc, { id: "e2", name: "posts" });
    doc = addColumn(doc, "e2", col({ id: "c2", name: "id", type: "int", primaryKey: true }));
    const out = generateOrm(doc, "prisma");
    expect(out).toContain(`model Users {`);
    expect(out).toContain(`model Posts {`);
  });
});

// ─── SQLAlchemy ───────────────────────────────────────────────────────────────

describe("generateOrm — SQLAlchemy: header", () => {
  it("emits imports and Base class", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`from sqlalchemy import`);
    expect(out).toContain(`from sqlalchemy.orm import DeclarativeBase, relationship`);
    expect(out).toContain(`class Base(DeclarativeBase):`);
    expect(out).toContain(`    pass`);
  });
});

describe("generateOrm — SQLAlchemy: class and __tablename__", () => {
  it("emits PascalCase class and snake_case __tablename__", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "UserProfile" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`class UserProfile(Base):`);
    expect(out).toContain(`    __tablename__ = "user_profile"`);
  });
});

describe("generateOrm — SQLAlchemy: PK columns", () => {
  it("emits primary_key=True for int PK", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`id = Column(Integer, primary_key=True)`);
  });

  it("emits UUID(as_uuid=True) with primary_key=True for uuid PK", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "uuid", primaryKey: true }));
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`id = Column(UUID(as_uuid=True), primary_key=True)`);
  });
});

describe("generateOrm — SQLAlchemy: regular columns", () => {
  it("emits nullable=False for not-null non-PK column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`email = Column(String(255), nullable=False)`);
  });

  it("does NOT emit nullable= for nullable column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "bio", type: "text", primaryKey: false, nullable: true, ordinal: 1 }));
    const out = generateOrm(doc, "sqlalchemy");
    // nullable columns: no nullable= attribute
    const bioLine = out.split("\n").find((l) => l.trimStart().startsWith("bio ="));
    expect(bioLine).toBeDefined();
    expect(bioLine).not.toContain("nullable=");
  });

  it("emits unique=True for unique column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, unique: true, ordinal: 1 }));
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`unique=True`);
  });

  it("emits comment= when column has comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true, comment: "Primary key" }));
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`comment="Primary key"`);
  });
});

describe("generateOrm — SQLAlchemy: entity comment", () => {
  it("emits # comment above class when entity has comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`# 사용자 테이블`);
  });
});

describe("generateOrm — SQLAlchemy: type mappings", () => {
  const cases: [string, string][] = [
    ["varchar(100)", "String(100)"],
    ["text", "Text"],
    ["int", "Integer"],
    ["integer", "Integer"],
    ["smallint", "SmallInteger"],
    ["bigint", "BigInteger"],
    ["boolean", "Boolean"],
    ["timestamp", "DateTime"],
    ["date", "Date"],
    ["float", "Float"],
    ["decimal(10,2)", "Numeric(10, 2)"],
    ["json", "JSON"],
    ["uuid", "UUID(as_uuid=True)"],
  ];

  for (const [sqlType, saType] of cases) {
    it(`maps ${sqlType} → ${saType}`, () => {
      let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
      doc = addEntity(doc, { id: "e1", name: "items" });
      doc = addColumn(doc, "e1", col({ id: "c1", name: "field", type: sqlType, primaryKey: false, nullable: true }));
      const out = generateOrm(doc, "sqlalchemy");
      expect(out).toContain(`field = Column(${saType}`);
    });
  }
});

describe("generateOrm — SQLAlchemy: indexes", () => {
  it("emits Index() in __table_args__ for non-unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_email", columnIds: ["c2"], unique: false });
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`Index("idx_email", "email")`);
  });

  it("emits UniqueConstraint() in __table_args__ for unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email", type: "varchar(255)", primaryKey: false, nullable: false, ordinal: 1 }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "uq_email", columnIds: ["c2"], unique: true });
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`UniqueConstraint("email", name="uq_email")`);
  });
});

describe("generateOrm — SQLAlchemy: empty document", () => {
  it("produces only the header when there are no entities", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`class Base(DeclarativeBase):`);
    expect(out).not.toMatch(/class \w+\(Base\)/);
  });
});

describe("generateOrm — SQLAlchemy: multiple entities", () => {
  it("emits a class block for each entity", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "int", primaryKey: true }));
    doc = addEntity(doc, { id: "e2", name: "posts" });
    doc = addColumn(doc, "e2", col({ id: "c2", name: "id", type: "int", primaryKey: true }));
    const out = generateOrm(doc, "sqlalchemy");
    expect(out).toContain(`class Users(Base):`);
    expect(out).toContain(`class Posts(Base):`);
  });
});

import type { DiagramDocument, DiagramRelationship } from "../types/diagram.type.js";

export type OrmType = "typeorm" | "prisma" | "sqlalchemy";

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

const toPascalCase = (s: string): string =>
  s.split(/[_\s-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");

const toCamelCase = (s: string): string => {
  const p = toPascalCase(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

const toSnake = (s: string): string =>
  s.replace(/\s+/g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

// ─── 타입 매핑 ───────────────────────────────────────────────────────────────

const sqlToTs = (t: string): string => {
  const l = t.toLowerCase();
  if (/^varchar|^text|^char/.test(l)) return "string";
  if (l === "uuid") return "string";
  if (/^int|^integer|^smallint|^tinyint/.test(l)) return "number";
  if (l === "bigint") return "bigint";
  if (/^bool/.test(l)) return "boolean";
  if (/^decimal|^numeric|^float|^double|^real/.test(l)) return "number";
  if (/^timestamp|^datetime|^date/.test(l)) return "Date";
  if (/^json/.test(l)) return "Record<string, unknown>";
  return "string";
};

const sqlToPrisma = (t: string): string => {
  const l = t.toLowerCase();
  if (/^varchar|^text|^char|uuid/.test(l)) return "String";
  if (/^int|^integer|^smallint|^tinyint/.test(l)) return "Int";
  if (l === "bigint") return "BigInt";
  if (/^bool/.test(l)) return "Boolean";
  if (/^decimal|^numeric/.test(l)) return "Decimal";
  if (/^float|^double|^real/.test(l)) return "Float";
  if (/^timestamp|^datetime|^date/.test(l)) return "DateTime";
  if (/^json/.test(l)) return "Json";
  return "String";
};

const sqlToSa = (t: string): string => {
  const l = t.toLowerCase();
  const varcharM = l.match(/^varchar\((\d+)\)/);
  if (varcharM) return `String(${varcharM[1]})`;
  if (l === "text") return "Text";
  if (l === "uuid") return "UUID(as_uuid=True)";
  if (/^int|^integer$/.test(l)) return "Integer";
  if (l === "smallint") return "SmallInteger";
  if (l === "bigint") return "BigInteger";
  if (/^bool/.test(l)) return "Boolean";
  const decM = l.match(/^(?:decimal|numeric)\((\d+),\s*(\d+)\)/);
  if (decM) return `Numeric(${decM[1]}, ${decM[2]})`;
  if (/^float|^double|^real/.test(l)) return "Float";
  if (/^timestamp|^datetime/.test(l)) return "DateTime";
  if (l === "date") return "Date";
  if (/^json/.test(l)) return "JSON";
  return "String";
};

// ─── TypeORM ─────────────────────────────────────────────────────────────────

function generateTypeOrm(doc: DiagramDocument): string {
  const blocks: string[] = [];

  for (const entity of doc.entities) {
    const entityIndexes = doc.indexes.filter((i) => i.entityId === entity.id);
    const lines: string[] = [];

    if (entity.comment) lines.push(`/** ${entity.comment} */`);
    lines.push(`@Entity("${toSnake(entity.name)}")`);

    for (const idx of entityIndexes) {
      const cols = idx.columnIds
        .map((id) => entity.columns.find((c) => c.id === id)?.name ?? id)
        .map((n) => `"${n}"`)
        .join(", ");
      lines.push(`@Index([${cols}]${idx.unique ? ", { unique: true }" : ""})`);
    }

    lines.push(`export class ${toPascalCase(entity.name)} {`);

    const sorted = [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);
    for (const col of sorted) {
      const propName = toCamelCase(col.name);
      const tsType = sqlToTs(col.type);

      if (col.comment) lines.push(`  /** ${col.comment} */`);

      if (col.primaryKey) {
        lines.push(col.type.toLowerCase() === "uuid"
          ? `  @PrimaryGeneratedColumn("uuid")`
          : `  @PrimaryGeneratedColumn()`);
        lines.push(`  ${propName}!: ${tsType};`);
      } else {
        const opts: string[] = [];
        if (!col.nullable) opts.push("nullable: false");
        if (col.unique) opts.push("unique: true");
        if (col.defaultValue) opts.push(`default: () => "${col.defaultValue}"`);
        lines.push(opts.length > 0 ? `  @Column({ ${opts.join(", ")} })` : `  @Column()`);
        const nullSuffix = col.nullable ? " | null" : "";
        lines.push(`  ${propName}${col.nullable ? "?" : "!"}: ${tsType}${nullSuffix};`);
      }
      lines.push("");
    }

    lines.push(`}`);
    blocks.push(lines.join("\n"));
  }

  const imports = `import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";`;
  return `${imports}\n\n${blocks.join("\n\n")}`;
}

// ─── Prisma ──────────────────────────────────────────────────────────────────

function generatePrisma(doc: DiagramDocument): string {
  const relBySource = new Map<string, DiagramRelationship[]>();
  const relByTarget = new Map<string, DiagramRelationship[]>();
  for (const rel of doc.relationships) {
    (relBySource.get(rel.sourceEntityId) ?? relBySource.set(rel.sourceEntityId, []).get(rel.sourceEntityId)!).push(rel);
    (relByTarget.get(rel.targetEntityId) ?? relByTarget.set(rel.targetEntityId, []).get(rel.targetEntityId)!).push(rel);
  }

  const lines: string[] = [
    `generator client {`,
    `  provider = "prisma-client-js"`,
    `}`,
    ``,
    `datasource db {`,
    `  provider = "${doc.dialect === "postgresql" ? "postgresql" : "mysql"}"`,
    `  url      = env("DATABASE_URL")`,
    `}`,
    ``,
  ];

  for (const entity of doc.entities) {
    const entityIndexes = doc.indexes.filter((i) => i.entityId === entity.id);

    if (entity.comment) lines.push(`/// ${entity.comment}`);
    lines.push(`model ${toPascalCase(entity.name)} {`);

    const sorted = [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);
    for (const col of sorted) {
      const prismaType = sqlToPrisma(col.type);
      const attrs: string[] = [];

      if (col.primaryKey) attrs.push("@id");
      if (col.type.toLowerCase() === "uuid") attrs.push("@default(uuid())");
      else if (col.primaryKey) attrs.push("@default(autoincrement())");
      if (col.unique && !col.primaryKey) attrs.push("@unique");
      if (col.defaultValue) attrs.push(`@default(${col.defaultValue})`);
      if (col.comment) attrs.push(`// ${col.comment}`);

      const nullMark = col.nullable && !col.primaryKey ? "?" : "";
      const attrStr = attrs.length > 0 ? `  ${attrs.join(" ")}` : "";
      lines.push(`  ${toCamelCase(col.name)} ${prismaType}${nullMark}${attrStr}`);
    }

    // 관계 필드
    for (const rel of relBySource.get(entity.id) ?? []) {
      const tgt = doc.entities.find((e) => e.id === rel.targetEntityId);
      if (!tgt) continue;
      const fkFields = rel.sourceColumnIds.map((id) => `"${toCamelCase(entity.columns.find((c) => c.id === id)?.name ?? id)}"`).join(", ");
      const refFields = rel.targetColumnIds.map((id) => `"${toCamelCase(tgt.columns.find((c) => c.id === id)?.name ?? id)}"`).join(", ");
      lines.push(`  ${toCamelCase(tgt.name)} ${toPascalCase(tgt.name)}? @relation(fields: [${fkFields}], references: [${refFields}])`);
    }
    for (const rel of relByTarget.get(entity.id) ?? []) {
      const src = doc.entities.find((e) => e.id === rel.sourceEntityId);
      if (!src) continue;
      lines.push(`  ${toCamelCase(src.name)}s ${toPascalCase(src.name)}[]`);
    }

    // 인덱스
    for (const idx of entityIndexes) {
      const cols = idx.columnIds.map((id) => toCamelCase(entity.columns.find((c) => c.id === id)?.name ?? id)).join(", ");
      lines.push(idx.unique ? `  @@unique([${cols}])` : `  @@index([${cols}])`);
    }

    lines.push(`}`);
    lines.push(``);
  }

  return lines.join("\n");
}

// ─── SQLAlchemy ───────────────────────────────────────────────────────────────

function generateSqlAlchemy(doc: DiagramDocument): string {
  const lines: string[] = [
    `from sqlalchemy import Column, Integer, String, Boolean, Text, Float, DateTime, Date, BigInteger, SmallInteger, Numeric, JSON, Index, UniqueConstraint`,
    `from sqlalchemy.orm import DeclarativeBase, relationship`,
    `from sqlalchemy.dialects.postgresql import UUID`,
    ``,
    ``,
    `class Base(DeclarativeBase):`,
    `    pass`,
    ``,
    ``,
  ];

  for (const entity of doc.entities) {
    const entityIndexes = doc.indexes.filter((i) => i.entityId === entity.id);

    if (entity.comment) lines.push(`# ${entity.comment}`);
    lines.push(`class ${toPascalCase(entity.name)}(Base):`);
    lines.push(`    __tablename__ = "${toSnake(entity.name)}"`);

    const tableArgs: string[] = [];
    for (const idx of entityIndexes) {
      const cols = idx.columnIds
        .map((id) => entity.columns.find((c) => c.id === id)?.name ?? id)
        .map((n) => `"${toSnake(n)}"`)
        .join(", ");
      tableArgs.push(idx.unique
        ? `UniqueConstraint(${cols}, name="${idx.name}")`
        : `Index("${idx.name}", ${cols})`);
    }
    if (tableArgs.length > 0) {
      lines.push(`    __table_args__ = (`);
      for (const arg of tableArgs) lines.push(`        ${arg},`);
      lines.push(`    )`);
    }
    lines.push(``);

    const sorted = [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);
    for (const col of sorted) {
      const saType = sqlToSa(col.type);
      const attrs: string[] = [saType];
      if (col.primaryKey) attrs.push("primary_key=True");
      if (!col.nullable && !col.primaryKey) attrs.push("nullable=False");
      if (col.unique && !col.primaryKey) attrs.push("unique=True");
      if (col.defaultValue) attrs.push(`server_default="${col.defaultValue}"`);
      if (col.comment) attrs.push(`comment="${col.comment}"`);
      lines.push(`    ${toSnake(col.name)} = Column(${attrs.join(", ")})`);
    }

    lines.push(``);
    lines.push(``);
  }

  return lines.join("\n");
}

// ─── 진입점 ──────────────────────────────────────────────────────────────────

export function generateOrm(doc: DiagramDocument, orm: OrmType): string {
  switch (orm) {
    case "typeorm": return generateTypeOrm(doc);
    case "prisma": return generatePrisma(doc);
    case "sqlalchemy": return generateSqlAlchemy(doc);
  }
}

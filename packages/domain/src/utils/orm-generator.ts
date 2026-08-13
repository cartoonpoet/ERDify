import type { DiagramColumn, DiagramDocument, DiagramEntity, DiagramIndex, DiagramRelationship } from "../types/diagram.type.js";

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

/** 컬럼 id → 이름. 컬럼이 지워져 참조가 끊긴 경우 id 원문을 그대로 쓴다. */
const columnNameById = (entity: DiagramEntity, id: string): string =>
  entity.columns.find((c) => c.id === id)?.name ?? id;

const sortedColumns = (entity: DiagramEntity): DiagramColumn[] =>
  [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);

const indexesOf = (doc: DiagramDocument, entityId: string): DiagramIndex[] =>
  doc.indexes.filter((i) => i.entityId === entityId);

// ─── 타입 매핑 ───────────────────────────────────────────────────────────────

const sqlToTs = (t: string): string => {
  const l = t.toLowerCase();
  if (/^varchar|^text|^char/.test(l)) return "string";
  if (l === "uuid") return "string";
  if (/^int|^integer|^smallint|^tinyint/.test(l)) return "number";
  if (l === "bigint") return "bigint";
  if (l.startsWith("bool")) return "boolean";
  if (/^decimal|^numeric|^float|^double|^real/.test(l)) return "number";
  if (/^timestamp|^datetime|^date/.test(l)) return "Date";
  if (l.startsWith("json")) return "Record<string, unknown>";
  return "string";
};

const sqlToPrisma = (t: string): string => {
  const l = t.toLowerCase();
  if (/^varchar|^text|^char|uuid/.test(l)) return "String";
  if (/^int|^integer|^smallint|^tinyint/.test(l)) return "Int";
  if (l === "bigint") return "BigInt";
  if (l.startsWith("bool")) return "Boolean";
  if (/^decimal|^numeric/.test(l)) return "Decimal";
  if (/^float|^double|^real/.test(l)) return "Float";
  if (/^timestamp|^datetime|^date/.test(l)) return "DateTime";
  if (l.startsWith("json")) return "Json";
  return "String";
};

const sqlToSa = (t: string): string => {
  const l = t.toLowerCase();
  const varcharM = /^varchar\((\d+)\)/.exec(l);
  if (varcharM) return `String(${varcharM[1]})`;
  if (l === "text") return "Text";
  if (l === "uuid") return "UUID(as_uuid=True)";
  if (/^int|^integer$/.test(l)) return "Integer";
  if (l === "smallint") return "SmallInteger";
  if (l === "bigint") return "BigInteger";
  if (l.startsWith("bool")) return "Boolean";
  const decM = /^(?:decimal|numeric)\((\d+),\s*(\d+)\)/.exec(l);
  if (decM) return `Numeric(${decM[1]}, ${decM[2]})`;
  if (/^float|^double|^real/.test(l)) return "Float";
  if (/^timestamp|^datetime/.test(l)) return "DateTime";
  if (l === "date") return "Date";
  if (l.startsWith("json")) return "JSON";
  return "String";
};

// ─── TypeORM ─────────────────────────────────────────────────────────────────

function renderTypeOrmIndex(idx: DiagramIndex, entity: DiagramEntity): string {
  const cols = idx.columnIds
    .map((id) => columnNameById(entity, id))
    .map((n) => `"${n}"`)
    .join(", ");
  return `@Index([${cols}]${idx.unique ? ", { unique: true }" : ""})`;
}

function renderTypeOrmPkColumn(col: DiagramColumn, propName: string, tsType: string): string[] {
  return [
    col.type.toLowerCase() === "uuid"
      ? `  @PrimaryGeneratedColumn("uuid")`
      : `  @PrimaryGeneratedColumn()`,
    `  ${propName}!: ${tsType};`,
  ];
}

function renderTypeOrmRegularColumn(col: DiagramColumn, propName: string, tsType: string): string[] {
  const opts: string[] = [];
  if (!col.nullable) opts.push("nullable: false");
  if (col.unique) opts.push("unique: true");
  if (col.defaultValue) opts.push(`default: () => "${col.defaultValue}"`);
  const decorator = opts.length > 0 ? `  @Column({ ${opts.join(", ")} })` : `  @Column()`;
  const nullSuffix = col.nullable ? " | null" : "";
  return [decorator, `  ${propName}${col.nullable ? "?" : "!"}: ${tsType}${nullSuffix};`];
}

function renderTypeOrmColumn(col: DiagramColumn): string[] {
  const propName = toCamelCase(col.name);
  const tsType = sqlToTs(col.type);
  const lines: string[] = [];
  if (col.comment) lines.push(`  /** ${col.comment} */`);
  lines.push(...(col.primaryKey
    ? renderTypeOrmPkColumn(col, propName, tsType)
    : renderTypeOrmRegularColumn(col, propName, tsType)));
  lines.push("");
  return lines;
}

function generateTypeOrm(doc: DiagramDocument): string {
  const blocks: string[] = [];

  for (const entity of doc.entities) {
    const lines: string[] = [];

    if (entity.comment) lines.push(`/** ${entity.comment} */`);
    lines.push(`@Entity("${toSnake(entity.name)}")`);
    for (const idx of indexesOf(doc, entity.id)) lines.push(renderTypeOrmIndex(idx, entity));
    lines.push(`export class ${toPascalCase(entity.name)} {`);
    for (const col of sortedColumns(entity)) lines.push(...renderTypeOrmColumn(col));
    lines.push(`}`);
    blocks.push(lines.join("\n"));
  }

  const imports = `import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";`;
  return `${imports}\n\n${blocks.join("\n\n")}`;
}

// ─── Prisma ──────────────────────────────────────────────────────────────────

function groupRelationshipsBy(
  relationships: DiagramRelationship[],
  key: "sourceEntityId" | "targetEntityId",
): Map<string, DiagramRelationship[]> {
  const map = new Map<string, DiagramRelationship[]>();
  for (const rel of relationships) {
    const list = map.get(rel[key]) ?? [];
    list.push(rel);
    map.set(rel[key], list);
  }
  return map;
}

function renderPrismaHeader(dialect: DiagramDocument["dialect"]): string[] {
  return [
    `generator client {`,
    `  provider = "prisma-client-js"`,
    `}`,
    ``,
    `datasource db {`,
    `  provider = "${dialect === "postgresql" ? "postgresql" : "mysql"}"`,
    `  url      = env("DATABASE_URL")`,
    `}`,
    ``,
  ];
}

function renderPrismaColumn(col: DiagramColumn): string {
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
  return `  ${toCamelCase(col.name)} ${prismaType}${nullMark}${attrStr}`;
}

/** 소스 측은 `@relation` 필드, 타깃 측은 역참조 배열 필드를 만든다. 끊긴 관계는 건너뛴다. */
function renderPrismaRelations(
  entity: DiagramEntity,
  doc: DiagramDocument,
  relBySource: Map<string, DiagramRelationship[]>,
  relByTarget: Map<string, DiagramRelationship[]>,
): string[] {
  const lines: string[] = [];
  for (const rel of relBySource.get(entity.id) ?? []) {
    const tgt = doc.entities.find((e) => e.id === rel.targetEntityId);
    if (!tgt) continue;
    const fkFields = rel.sourceColumnIds.map((id) => `"${toCamelCase(columnNameById(entity, id))}"`).join(", ");
    const refFields = rel.targetColumnIds.map((id) => `"${toCamelCase(columnNameById(tgt, id))}"`).join(", ");
    lines.push(`  ${toCamelCase(tgt.name)} ${toPascalCase(tgt.name)}? @relation(fields: [${fkFields}], references: [${refFields}])`);
  }
  for (const rel of relByTarget.get(entity.id) ?? []) {
    const src = doc.entities.find((e) => e.id === rel.sourceEntityId);
    if (!src) continue;
    lines.push(`  ${toCamelCase(src.name)}s ${toPascalCase(src.name)}[]`);
  }
  return lines;
}

function renderPrismaIndex(idx: DiagramIndex, entity: DiagramEntity): string {
  const cols = idx.columnIds.map((id) => toCamelCase(columnNameById(entity, id))).join(", ");
  return idx.unique ? `  @@unique([${cols}])` : `  @@index([${cols}])`;
}

function generatePrisma(doc: DiagramDocument): string {
  const relBySource = groupRelationshipsBy(doc.relationships, "sourceEntityId");
  const relByTarget = groupRelationshipsBy(doc.relationships, "targetEntityId");

  const lines: string[] = renderPrismaHeader(doc.dialect);

  for (const entity of doc.entities) {
    if (entity.comment) lines.push(`/// ${entity.comment}`);
    lines.push(`model ${toPascalCase(entity.name)} {`);
    for (const col of sortedColumns(entity)) lines.push(renderPrismaColumn(col));
    lines.push(...renderPrismaRelations(entity, doc, relBySource, relByTarget));
    for (const idx of indexesOf(doc, entity.id)) lines.push(renderPrismaIndex(idx, entity));
    lines.push(`}`, ``);
  }

  return lines.join("\n");
}

// ─── SQLAlchemy ───────────────────────────────────────────────────────────────

const SQLALCHEMY_HEADER = [
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

function renderSaTableArgs(entityIndexes: DiagramIndex[], entity: DiagramEntity): string[] {
  const tableArgs: string[] = [];
  for (const idx of entityIndexes) {
    const cols = idx.columnIds
      .map((id) => columnNameById(entity, id))
      .map((n) => `"${toSnake(n)}"`)
      .join(", ");
    tableArgs.push(idx.unique
      ? `UniqueConstraint(${cols}, name="${idx.name}")`
      : `Index("${idx.name}", ${cols})`);
  }
  if (tableArgs.length === 0) return [];
  return [`    __table_args__ = (`, ...tableArgs.map((arg) => `        ${arg},`), `    )`];
}

function renderSaColumn(col: DiagramColumn): string {
  const attrs: string[] = [sqlToSa(col.type)];
  if (col.primaryKey) attrs.push("primary_key=True");
  if (!col.nullable && !col.primaryKey) attrs.push("nullable=False");
  if (col.unique && !col.primaryKey) attrs.push("unique=True");
  if (col.defaultValue) attrs.push(`server_default="${col.defaultValue}"`);
  if (col.comment) attrs.push(`comment="${col.comment}"`);
  return `    ${toSnake(col.name)} = Column(${attrs.join(", ")})`;
}

function generateSqlAlchemy(doc: DiagramDocument): string {
  const lines: string[] = [...SQLALCHEMY_HEADER];

  for (const entity of doc.entities) {
    if (entity.comment) lines.push(`# ${entity.comment}`);
    lines.push(
      `class ${toPascalCase(entity.name)}(Base):`,
      `    __tablename__ = "${toSnake(entity.name)}"`,
    );
    lines.push(...renderSaTableArgs(indexesOf(doc, entity.id), entity));
    lines.push(``);
    for (const col of sortedColumns(entity)) lines.push(renderSaColumn(col));
    lines.push(``, ``);
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

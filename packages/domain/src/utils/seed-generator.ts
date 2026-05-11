import type { DiagramDocument, DiagramEntity } from "../types/index.js";
import { generateDdl } from "./ddl-generator.js";

function quote(name: string, dialect: DiagramDocument["dialect"]): string {
  if (dialect === "postgresql") return `"${name}"`;
  if (dialect === "mssql") return `[${name}]`;
  return `\`${name}\``;
}

function qualifiedName(entity: DiagramEntity, dialect: DiagramDocument["dialect"]): string {
  if (!entity.schema) return quote(entity.name, dialect);
  if (dialect === "mssql") return `[${entity.schema}].${quote(entity.name, dialect)}`;
  return `${quote(entity.schema, dialect)}.${quote(entity.name, dialect)}`;
}

const NUMERIC_TYPE = /^(int|bigint|smallint|tinyint|float|double|decimal|numeric|real|bit|bool)/i;

function quoteValue(value: string, columnType: string): string {
  const v = value.trim();
  if (v === "" || v.toLowerCase() === "null") return "NULL";
  if (NUMERIC_TYPE.test(columnType)) return v;
  return `'${v.replace(/'/g, "''")}'`;
}

export function generateSeedSql(doc: DiagramDocument): string {
  const { dialect, entities } = doc;
  const parts: string[] = [];

  for (const entity of entities) {
    if (!entity.seedData || entity.seedData.length === 0) continue;

    const sortedCols = [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);
    const usedCols = sortedCols.filter((col) =>
      entity.seedData!.some((row) => (row[col.id] ?? "") !== "")
    );
    if (usedCols.length === 0) continue;

    const colList = usedCols.map((c) => quote(c.name, dialect)).join(", ");
    const valueRows = entity.seedData.map((row) => {
      const vals = usedCols.map((col) => quoteValue(row[col.id] ?? "", col.type));
      return `  (${vals.join(", ")})`;
    });

    parts.push(
      `INSERT INTO ${qualifiedName(entity, dialect)} (${colList}) VALUES\n${valueRows.join(",\n")};`
    );
  }

  return parts.join("\n\n");
}

export function generateSetupSql(doc: DiagramDocument): string {
  const ddl = generateDdl(doc).trim();
  const seed = generateSeedSql(doc).trim();
  if (!ddl && !seed) return "";
  if (!seed) return ddl;
  if (!ddl) return seed;
  return `${ddl}\n\n-- Seed Data\n${seed}`;
}

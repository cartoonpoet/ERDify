import type { DiagramColumn, DiagramDocument, DiagramEntity, DiagramRelationship } from "../types/index.js";

function quote(name: string, dialect: DiagramDocument["dialect"]): string {
  if (dialect === "postgresql") return `"${name}"`;
  return `\`${name}\``;
}

function referentialAction(action: DiagramRelationship["onDelete"]): string {
  switch (action) {
    case "cascade": return "CASCADE";
    case "restrict": return "RESTRICT";
    case "set-null": return "SET NULL";
    case "no-action": return "NO ACTION";
    default: return action;
  }
}

function columnDdl(col: DiagramColumn, dialect: DiagramDocument["dialect"]): string {
  const parts: string[] = [quote(col.name, dialect), col.type];
  if (!col.nullable) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.defaultValue !== null) parts.push(`DEFAULT ${col.defaultValue}`);
  return `  ${parts.join(" ")}`;
}

function entityDdl(entity: DiagramEntity, dialect: DiagramDocument["dialect"]): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE ${quote(entity.name, dialect)} (`);

  const sorted = [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);
  const pkCols = sorted.filter((c) => c.primaryKey);
  const hasTrailing = pkCols.length > 0;

  sorted.forEach((col, i) => {
    const isLast = i === sorted.length - 1 && !hasTrailing;
    lines.push(`${columnDdl(col, dialect)}${isLast ? "" : ","}`);
  });

  if (pkCols.length > 0) {
    const pkList = pkCols.map((c) => quote(c.name, dialect)).join(", ");
    lines.push(`  PRIMARY KEY (${pkList})`);
  }

  lines.push(");");
  return lines.join("\n");
}

function fkDdl(
  rel: DiagramRelationship,
  entities: DiagramEntity[],
  dialect: DiagramDocument["dialect"],
): string {
  const sourceEntity = entities.find((e) => e.id === rel.sourceEntityId);
  const targetEntity = entities.find((e) => e.id === rel.targetEntityId);
  if (!sourceEntity || !targetEntity) return "";

  const constraintName = rel.name.trim() || `fk_${sourceEntity.name}_${targetEntity.name}`;

  const srcCols = rel.sourceColumnIds
    .map((id) => {
      const col = sourceEntity.columns.find((c) => c.id === id);
      return col ? quote(col.name, dialect) : id;
    })
    .join(", ");

  const tgtCols = rel.targetColumnIds
    .map((id) => {
      const col = targetEntity.columns.find((c) => c.id === id);
      return col ? quote(col.name, dialect) : id;
    })
    .join(", ");

  return [
    `ALTER TABLE ${quote(sourceEntity.name, dialect)}`,
    `  ADD CONSTRAINT ${quote(constraintName, dialect)}`,
    `  FOREIGN KEY (${srcCols})`,
    `  REFERENCES ${quote(targetEntity.name, dialect)} (${tgtCols})`,
    `  ON DELETE ${referentialAction(rel.onDelete)}`,
    `  ON UPDATE ${referentialAction(rel.onUpdate)};`,
  ].join("\n");
}

export function generateDdl(doc: DiagramDocument): string {
  const { dialect, entities, relationships } = doc;
  const tableParts = entities.map((e) => entityDdl(e, dialect));
  const fkParts = relationships
    .map((r) => fkDdl(r, entities, dialect))
    .filter(Boolean);
  return [...tableParts, ...fkParts].join("\n\n\n");
}

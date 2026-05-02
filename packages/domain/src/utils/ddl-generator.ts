import type { DiagramColumn, DiagramDocument, DiagramEntity, DiagramIndex, DiagramRelationship } from "../types/index.js";

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

function escapeComment(value: string): string {
  return value.replace(/'/g, "''");
}

function columnDdl(col: DiagramColumn, dialect: DiagramDocument["dialect"]): string {
  const parts: string[] = [quote(col.name, dialect), col.type];
  if (!col.nullable) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.defaultValue !== null) parts.push(`DEFAULT ${col.defaultValue}`);
  if (col.comment && dialect !== "postgresql") {
    parts.push(`COMMENT '${escapeComment(col.comment)}'`);
  }
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
    lines.push(`  PRIMARY KEY (${pkCols.map((c) => quote(c.name, dialect)).join(", ")})`);
  }

  if (entity.comment && dialect !== "postgresql") {
    lines.push(`) COMMENT='${escapeComment(entity.comment)}';`);
  } else {
    lines.push(");");
  }

  return lines.join("\n");
}

function commentsDdl(entity: DiagramEntity, dialect: DiagramDocument["dialect"]): string {
  if (dialect === "postgresql") {
    const parts: string[] = [];
    if (entity.comment) {
      parts.push(`COMMENT ON TABLE ${quote(entity.name, dialect)} IS '${escapeComment(entity.comment)}';`);
    }
    for (const col of entity.columns) {
      if (col.comment) {
        parts.push(
          `COMMENT ON COLUMN ${quote(entity.name, dialect)}.${quote(col.name, dialect)} IS '${escapeComment(col.comment)}';`
        );
      }
    }
    return parts.join("\n");
  }
  return "";
}

function indexDdl(index: DiagramIndex, entity: DiagramEntity, dialect: DiagramDocument["dialect"]): string {
  if (index.columnIds.length === 0) return "";
  const cols = index.columnIds
    .map((id) => {
      const col = entity.columns.find((c) => c.id === id);
      return col ? quote(col.name, dialect) : null;
    })
    .filter(Boolean)
    .join(", ");
  if (!cols) return "";
  const keyword = index.unique ? "CREATE UNIQUE INDEX" : "CREATE INDEX";
  return `${keyword} ${quote(index.name, dialect)} ON ${quote(entity.name, dialect)} (${cols});`;
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
  const { dialect, entities, relationships, indexes } = doc;
  const parts: string[] = [];

  for (const entity of entities) {
    const table = entityDdl(entity, dialect);
    const comments = commentsDdl(entity, dialect);
    const entityIndexes = indexes
      .filter((idx) => idx.entityId === entity.id)
      .map((idx) => indexDdl(idx, entity, dialect))
      .filter(Boolean);

    parts.push(table);
    if (comments) parts.push(comments);
    if (entityIndexes.length > 0) parts.push(entityIndexes.join("\n"));
  }

  const fkParts = relationships
    .map((r) => fkDdl(r, entities, dialect))
    .filter(Boolean);

  if (fkParts.length > 0) parts.push(fkParts.join("\n\n"));

  return parts.join("\n\n");
}

import type {
  DdlReport,
  DdlWarning,
  DiagramColumn,
  DiagramDocument,
  DiagramEntity,
  DiagramIndex,
  DiagramRelationship,
} from "../types/index.js";

function quote(name: string, dialect: DiagramDocument["dialect"]): string {
  if (dialect === "postgresql") return `"${name}"`;
  if (dialect === "mssql") return `[${name}]`;
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
  // AUTO_INCREMENT는 MySQL/MariaDB 문법. 다른 dialect에서는 잘못된 SQL이 되므로 출력하지 않는다.
  if (col.autoIncrement && (dialect === "mysql" || dialect === "mariadb")) {
    parts.push("AUTO_INCREMENT");
  }
  if (col.comment && dialect !== "postgresql" && dialect !== "mssql") {
    parts.push(`COMMENT '${escapeComment(col.comment)}'`);
  }
  return `  ${parts.join(" ")}`;
}

function qualifiedName(entity: DiagramEntity, dialect: DiagramDocument["dialect"]): string {
  if (!entity.schema) return quote(entity.name, dialect);
  if (dialect === "mssql") return `[${entity.schema}].${quote(entity.name, dialect)}`;
  return `${quote(entity.schema, dialect)}.${quote(entity.name, dialect)}`;
}

function entityDdl(entity: DiagramEntity, dialect: DiagramDocument["dialect"]): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE ${qualifiedName(entity, dialect)} (`);

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

  if (entity.comment && dialect !== "postgresql" && dialect !== "mssql") {
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
      parts.push(`COMMENT ON TABLE ${qualifiedName(entity, dialect)} IS '${escapeComment(entity.comment)}';`);
    }
    for (const col of entity.columns) {
      if (col.comment) {
        parts.push(
          `COMMENT ON COLUMN ${qualifiedName(entity, dialect)}.${quote(col.name, dialect)} IS '${escapeComment(col.comment)}';`
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
  return `${keyword} ${quote(index.name, dialect)} ON ${qualifiedName(entity, dialect)} (${cols});`;
}

interface ResolvedColumn {
  ok: boolean;
  name: string;
}

function resolveColumns(ids: string[], entity: DiagramEntity): ResolvedColumn[] {
  return ids.map((id) => {
    const col = entity.columns.find((c) => c.id === id);
    return col ? { ok: true, name: col.name } : { ok: false, name: id };
  });
}

/**
 * FK ALTER TABLE 문을 생성한다. 컬럼 매핑을 확정할 수 없으면(빈 컬럼/미해결 id/개수 불일치)
 * 문법 오류 SQL(`FOREIGN KEY () REFERENCES x ()`) 대신 SQL 주석으로 강등하고 경고를 남긴다.
 * — export 불변식: 어떤 경우에도 실행 불가능한 SQL을 출력하지 않는다.
 */
function fkDdl(
  rel: DiagramRelationship,
  entities: DiagramEntity[],
  dialect: DiagramDocument["dialect"],
  warnings: DdlWarning[],
): string {
  const sourceEntity = entities.find((e) => e.id === rel.sourceEntityId);
  const targetEntity = entities.find((e) => e.id === rel.targetEntityId);
  const label = rel.name.trim() || rel.id;

  if (!sourceEntity || !targetEntity) {
    warnings.push({
      code: "fk_missing_entity",
      relationship: label,
      message: `Skipped FK "${label}": source or target entity not found.`,
    });
    return `-- [erdify] Skipped FK ${label}: source or target entity not found`;
  }

  const constraintName = rel.name.trim() || `fk_${sourceEntity.name}_${targetEntity.name}`;
  const src = resolveColumns(rel.sourceColumnIds, sourceEntity);
  const tgt = resolveColumns(rel.targetColumnIds, targetEntity);
  const srcUnresolved = src.filter((r) => !r.ok).map((r) => r.name);
  const tgtUnresolved = tgt.filter((r) => !r.ok).map((r) => r.name);

  const problems: string[] = [];
  if (src.length === 0) problems.push("no source columns");
  if (tgt.length === 0) problems.push("no target columns");
  if (srcUnresolved.length > 0) problems.push(`unresolved source columns [${srcUnresolved.join(", ")}]`);
  if (tgtUnresolved.length > 0) problems.push(`unresolved target columns [${tgtUnresolved.join(", ")}]`);
  const arityMismatch =
    src.length > 0 && tgt.length > 0 && src.length !== tgt.length;
  if (arityMismatch) problems.push(`column count mismatch (${src.length} vs ${tgt.length})`);

  if (problems.length > 0) {
    const onlyArityIssue =
      arityMismatch && srcUnresolved.length === 0 && tgtUnresolved.length === 0;
    warnings.push({
      code: onlyArityIssue ? "fk_column_count_mismatch" : "fk_unresolved_columns",
      entity: sourceEntity.name,
      relationship: constraintName,
      message: `Skipped FK "${constraintName}" (${sourceEntity.name} -> ${targetEntity.name}): ${problems.join("; ")}.`,
    });
    return `-- [erdify] Skipped FK ${constraintName} (${sourceEntity.name} -> ${targetEntity.name}): ${problems.join("; ")}`;
  }

  const srcCols = src.map((r) => quote(r.name, dialect)).join(", ");
  const tgtCols = tgt.map((r) => quote(r.name, dialect)).join(", ");

  return [
    `ALTER TABLE ${qualifiedName(sourceEntity, dialect)}`,
    `  ADD CONSTRAINT ${quote(constraintName, dialect)}`,
    `  FOREIGN KEY (${srcCols})`,
    `  REFERENCES ${qualifiedName(targetEntity, dialect)} (${tgtCols})`,
    `  ON DELETE ${referentialAction(rel.onDelete)}`,
    `  ON UPDATE ${referentialAction(rel.onUpdate)};`,
  ].join("\n");
}

/**
 * MySQL/MariaDB에서 AUTO_INCREMENT 컬럼은 (1) 키(PK 또는 인덱스 구성 컬럼)여야 하고
 * (2) 테이블당 하나만 허용된다. 위반 시 경고를 남긴다(SQL은 그대로 출력 — 강등 아님).
 */
function checkAutoIncrement(
  entity: DiagramEntity,
  indexes: DiagramIndex[],
  dialect: DiagramDocument["dialect"],
  warnings: DdlWarning[],
): void {
  if (dialect !== "mysql" && dialect !== "mariadb") return;
  const autoCols = entity.columns.filter((c) => c.autoIncrement);
  if (autoCols.length === 0) return;

  const indexedColumnIds = new Set(
    indexes.filter((idx) => idx.entityId === entity.id).flatMap((idx) => idx.columnIds),
  );
  for (const col of autoCols) {
    const keyed = col.primaryKey || indexedColumnIds.has(col.id);
    if (!keyed) {
      warnings.push({
        code: "autoincrement_not_keyed",
        entity: entity.name,
        column: col.name,
        message: `AUTO_INCREMENT column "${entity.name}.${col.name}" is not a key (PK or index) — MySQL requires it to be defined as a key.`,
      });
    }
  }
  if (autoCols.length > 1) {
    warnings.push({
      code: "autoincrement_multiple",
      entity: entity.name,
      message: `Table "${entity.name}" has ${autoCols.length} AUTO_INCREMENT columns — MySQL allows only one.`,
    });
  }
}

/**
 * DDL과 export 경고를 함께 반환하는 export 채널.
 * 실행 불가능한 항목은 SQL 주석으로 강등되고 `warnings`에 기록된다.
 */
export function generateDdlReport(doc: DiagramDocument): DdlReport {
  const { dialect, entities, relationships, indexes } = doc;
  const warnings: DdlWarning[] = [];
  const parts: string[] = [];

  for (const entity of entities) {
    const table = entityDdl(entity, dialect);
    const comments = commentsDdl(entity, dialect);
    const entityIndexes = indexes
      .filter((idx) => idx.entityId === entity.id)
      .map((idx) => indexDdl(idx, entity, dialect))
      .filter(Boolean);

    checkAutoIncrement(entity, indexes, dialect, warnings);
    parts.push(table);
    if (comments) parts.push(comments);
    if (entityIndexes.length > 0) parts.push(entityIndexes.join("\n"));
  }

  const fkParts = relationships
    .map((r) => fkDdl(r, entities, dialect, warnings))
    .filter(Boolean);

  if (fkParts.length > 0) parts.push(fkParts.join("\n\n"));

  return { sql: parts.join("\n\n"), warnings };
}

/** DDL SQL 문자열만 반환하는 하위호환 래퍼. 경고가 필요하면 generateDdlReport 사용. */
export function generateDdl(doc: DiagramDocument): string {
  return generateDdlReport(doc).sql;
}

import type {
  DdlReport,
  DdlWarning,
  DiagramColumn,
  DiagramDocument,
  DiagramEntity,
  DiagramIndex,
  DiagramObject,
  DiagramRelationship,
} from "../types/index.js";

function quote(name: string, dialect: DiagramDocument["dialect"]): string {
  // 식별자 앞뒤 공백은 MySQL `ERROR 1166 Incorrect column name`을 유발하므로 export 시 방어적으로 trim한다.
  const n = name.trim();
  if (dialect === "postgresql") return `"${n}"`;
  if (dialect === "mssql") return `[${n}]`;
  return `\`${n}\``;
}

// DEFAULT 값 자동 quoting이 필요없는(이미 안전한) 형태들
const SQL_DEFAULT_KEYWORDS = new Set([
  "NULL", "TRUE", "FALSE", "CURRENT_TIMESTAMP", "CURRENT_DATE", "CURRENT_TIME",
  "CURRENT_USER", "NOW", "LOCALTIME", "LOCALTIMESTAMP",
]);

function isStringType(type: string): boolean {
  return /\b(char|varchar|nchar|nvarchar|character|text|clob|enum|set)\b/i.test(type);
}

/** 문자열 컬럼의 DEFAULT가 인용되지 않은 맨몸 리터럴이면 true (예: `DEFAULT 코드값` → 문법 오류) */
function defaultNeedsQuoting(defaultValue: string): boolean {
  const v = defaultValue.trim();
  if (v === "") return false;
  if (/^['"`]/.test(v)) return false; // 이미 인용됨
  if (/^-?\d+(\.\d+)?$/.test(v)) return false; // 숫자
  if (v.includes("(")) return false; // 함수/표현식
  if (SQL_DEFAULT_KEYWORDS.has(v.toUpperCase())) return false; // SQL 키워드
  return true;
}

/** 타입 필드에 잘못 섞여 들어간 절(DEFAULT/CHARSET=/세미콜론 이후)을 제거한다. */
function sanitizeType(type: string): { value: string; changed: boolean } {
  let v = type.split(";")[0] ?? type; // 세미콜론 이후 제거
  v = v.replace(/\s+DEFAULT\s+.*/i, ""); // 타입 필드엔 DEFAULT 절이 올 수 없음
  v = v.replace(/\s+CHARSET\s*=\s*\S+/i, ""); // `CHARSET=utf8mb4` 형태 제거
  v = v.trim();
  return { value: v, changed: v !== type.trim() };
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

function columnDdl(
  col: DiagramColumn,
  dialect: DiagramDocument["dialect"],
  entityName: string,
  warnings: DdlWarning[],
): string {
  const colName = col.name.trim();
  const { value: type, changed: typeChanged } = sanitizeType(col.type);
  if (typeChanged) {
    warnings.push({
      code: "type_sanitized",
      entity: entityName,
      column: colName,
      message: `Sanitized column type for "${entityName}.${colName}": "${col.type}" → "${type}".`,
    });
  }

  const parts: string[] = [quote(col.name, dialect), type];
  if (!col.nullable) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.defaultValue !== null) {
    if (isStringType(type) && defaultNeedsQuoting(col.defaultValue)) {
      parts.push(`DEFAULT '${escapeComment(col.defaultValue.trim())}'`);
      warnings.push({
        code: "default_autoquoted",
        entity: entityName,
        column: colName,
        message: `Auto-quoted DEFAULT for "${entityName}.${colName}": ${col.defaultValue} → '${col.defaultValue.trim()}'.`,
      });
    } else {
      parts.push(`DEFAULT ${col.defaultValue}`);
    }
  }
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

function entityDdl(
  entity: DiagramEntity,
  dialect: DiagramDocument["dialect"],
  warnings: DdlWarning[],
): string {
  const lines: string[] = [];
  const entityName = entity.name.trim();
  lines.push(`CREATE TABLE ${qualifiedName(entity, dialect)} (`);

  const sorted = [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);
  const pkCols = sorted.filter((c) => c.primaryKey);
  const hasTrailing = pkCols.length > 0;

  sorted.forEach((col, i) => {
    const isLast = i === sorted.length - 1 && !hasTrailing;
    lines.push(`${columnDdl(col, dialect, entityName, warnings)}${isLast ? "" : ","}`);
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

/** target이 key의 선두 prefix인지 (MySQL FK는 참조 컬럼이 어떤 인덱스의 leftmost 컬럼이어야 함) */
function isLeadingPrefix(target: string[], key: string[]): boolean {
  if (target.length === 0 || target.length > key.length) return false;
  return target.every((id, i) => id === key[i]);
}

/** FK가 참조하는 대상 컬럼이 대상 테이블의 PK/인덱스로 커버되는지 (미커버 시 MySQL ERROR 1822) */
function isTargetKeyed(entity: DiagramEntity, indexes: DiagramIndex[], targetColumnIds: string[]): boolean {
  const pkIds = entity.columns
    .filter((c) => c.primaryKey)
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((c) => c.id);
  if (isLeadingPrefix(targetColumnIds, pkIds)) return true;
  return indexes
    .filter((idx) => idx.entityId === entity.id)
    .some((idx) => isLeadingPrefix(targetColumnIds, idx.columnIds));
}

/**
 * FK ALTER TABLE 문을 생성한다. 컬럼 매핑을 확정할 수 없으면(빈 컬럼/미해결 id/개수 불일치)
 * 문법 오류 SQL(`FOREIGN KEY () REFERENCES x ()`) 대신 SQL 주석으로 강등하고 경고를 남긴다.
 * — export 불변식: 어떤 경우에도 실행 불가능한 SQL을 출력하지 않는다.
 */
function fkDdl(
  rel: DiagramRelationship,
  entities: DiagramEntity[],
  indexes: DiagramIndex[],
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

  // 대상 컬럼이 대상 테이블의 키로 커버되지 않으면 MySQL이 FK 생성을 거부한다(ERROR 1822).
  if (
    (dialect === "mysql" || dialect === "mariadb") &&
    !isTargetKeyed(targetEntity, indexes, rel.targetColumnIds)
  ) {
    warnings.push({
      code: "fk_target_not_keyed",
      entity: sourceEntity.name,
      relationship: constraintName,
      message: `FK "${constraintName}" references ${targetEntity.name}(${tgt.map((r) => r.name).join(", ")}) which is not covered by a PK/unique key on "${targetEntity.name}" — MySQL will reject this (ERROR 1822).`,
    });
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

/** 식별자(테이블/컬럼/스키마/인덱스명)의 앞뒤 공백을 감지해 경고한다. export 시엔 quote()가 방어적으로 trim한다. */
function collectIdentifierWarnings(doc: DiagramDocument, warnings: DdlWarning[]): void {
  const hasWhitespace = (s: string): boolean => s !== s.trim() && s.trim() !== "";
  for (const entity of doc.entities) {
    const entityName = entity.name.trim();
    if (hasWhitespace(entity.name)) {
      warnings.push({
        code: "identifier_whitespace",
        entity: entityName,
        message: `Table identifier "${entity.name}" has leading/trailing whitespace (auto-trimmed on export).`,
      });
    }
    if (entity.schema && hasWhitespace(entity.schema)) {
      warnings.push({
        code: "identifier_whitespace",
        entity: entityName,
        message: `Schema identifier "${entity.schema}" has leading/trailing whitespace (auto-trimmed on export).`,
      });
    }
    for (const col of entity.columns) {
      if (hasWhitespace(col.name)) {
        warnings.push({
          code: "identifier_whitespace",
          entity: entityName,
          column: col.name.trim(),
          message: `Column identifier "${col.name}" in "${entityName}" has leading/trailing whitespace (auto-trimmed on export).`,
        });
      }
    }
  }
  for (const idx of doc.indexes) {
    if (hasWhitespace(idx.name)) {
      warnings.push({
        code: "identifier_whitespace",
        message: `Index identifier "${idx.name}" has leading/trailing whitespace (auto-trimmed on export).`,
      });
    }
  }
}

// 사설 IP(10.x, 172.16~31.x, 192.168.x) / 이메일 패턴 — export 산출물로 내부망 정보가 새는 것을 방지
const PRIVATE_IP_RE = /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

/** COMMENT/DEFAULT에 사설 IP·이메일이 있으면 경고 (SQL은 그대로 출력 — warn-only) */
function checkSensitiveInfo(doc: DiagramDocument, warnings: DdlWarning[]): void {
  const scan = (text: string | null, where: string, entityName: string, columnName?: string): void => {
    if (!text) return;
    const kind = PRIVATE_IP_RE.test(text) ? "private IP" : EMAIL_RE.test(text) ? "email" : null;
    if (!kind) return;
    warnings.push({
      code: "sensitive_info",
      entity: entityName,
      ...(columnName ? { column: columnName } : {}),
      message: `Possible ${kind} in ${where} of "${columnName ? `${entityName}.${columnName}` : entityName}" — review before sharing the exported DDL.`,
    });
  };
  for (const entity of doc.entities) {
    const entityName = entity.name.trim();
    scan(entity.comment, "table comment", entityName);
    for (const col of entity.columns) {
      scan(col.comment, "column comment", entityName, col.name.trim());
      scan(col.defaultValue, "default value", entityName, col.name.trim());
    }
  }
}

/**
 * DDL과 export 경고를 함께 반환하는 export 채널.
 * 실행 불가능한 항목은 SQL 주석으로 강등되고 `warnings`에 기록된다.
 */
/**
 * 객체(프로시저·함수·트리거·뷰)의 SQL 원문을 DDL 끝에 append한다.
 * sql은 사용자 원문 텍스트라 dialect 검증 대상이 아니므로 객체당 object_raw_sql 경고를 남긴다.
 */
function objectsDdl(objects: DiagramObject[], warnings: DdlWarning[]): string {
  if (objects.length === 0) return "";
  const blocks: string[] = ["-- Objects"];
  for (const obj of objects) {
    // 헤더는 한 줄 주석이어야 한다 — 이름에 개행이 있으면 다음 줄이 실행 SQL로 새어나가므로 공백으로 정규화한다.
    const headerName = obj.name.replace(/[\r\n]+/g, " ");
    blocks.push(`-- ${obj.kind}: ${headerName}\n${obj.sql.trim()}`);
    warnings.push({
      code: "object_raw_sql",
      message: `객체 "${obj.name}"(${obj.kind})의 SQL은 원문 텍스트로 내보내지며 dialect 검증 대상이 아닙니다.`,
      entity: obj.name,
    });
  }
  return blocks.join("\n\n");
}

export function generateDdlReport(doc: DiagramDocument): DdlReport {
  const { dialect, entities, relationships, indexes } = doc;
  const warnings: DdlWarning[] = [];
  const parts: string[] = [];

  collectIdentifierWarnings(doc, warnings);
  checkSensitiveInfo(doc, warnings);

  for (const entity of entities) {
    const table = entityDdl(entity, dialect, warnings);
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
    .map((r) => fkDdl(r, entities, indexes, dialect, warnings))
    .filter(Boolean);

  if (fkParts.length > 0) parts.push(fkParts.join("\n\n"));

  const objectsSql = objectsDdl(doc.objects ?? [], warnings);
  if (objectsSql) parts.push(objectsSql);

  return { sql: parts.join("\n\n"), warnings };
}

/** DDL SQL 문자열만 반환하는 하위호환 래퍼. 경고가 필요하면 generateDdlReport 사용. */
export function generateDdl(doc: DiagramDocument): string {
  return generateDdlReport(doc).sql;
}

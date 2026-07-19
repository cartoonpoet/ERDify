import type { DiagramDocument, DiagramDialect, DiagramEntity, DiagramColumn, DiagramIndex, DiagramRelationship, SeedRow } from "@erdify/domain";
import { randomUUID as uuid } from "./uuid";

function stripIdentifierQuotes(s: string): string {
  if (s.startsWith("[") && s.endsWith("]")) return s.slice(1, -1);
  return s.replaceAll(/^["'`]|["'`]$/g, "");
}

// Parses "schema"."table", [schema].[table], schema.table, or just table
function parseSchemaAndTable(raw: string): { schema: string | null; name: string } {
  const trimmed = raw.trim();
  // MSSQL: [schema].[table]
  const mssql = /^\[([^\]]*)\]\.\[([^\]]*)\]$/.exec(trimmed);
  if (mssql) return { schema: mssql[1]! || null, name: mssql[2]! };
  // Quoted: "schema"."table" or `schema`.`table`
  const quoted = /^(["'`])([^"'`]+)\1\.(["'`])([^"'`]+)\3$/.exec(trimmed);
  if (quoted) return { schema: quoted[2]! || null, name: quoted[4]! };
  // Dotted unquoted: schema.table
  const dot = trimmed.lastIndexOf(".");
  if (dot !== -1) {
    return {
      schema: stripIdentifierQuotes(trimmed.slice(0, dot)) || null,
      name: stripIdentifierQuotes(trimmed.slice(dot + 1)),
    };
  }
  return { schema: null, name: stripIdentifierQuotes(trimmed) };
}

function removeComments(sql: string): string {
  sql = sql.replaceAll(/\uFEFF/g, ""); // strip UTF-8 BOM (appears when multiple files are joined)
  sql = sql.replaceAll(/\/\*[\s\S]*?\*\//g, "");
  sql = sql.replaceAll(/--[^\n]*/g, "");
  return sql;
}

function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let current = "";
  for (const ch of s) {
    if (!inString && (ch === "'" || ch === '"' || ch === "`")) {
      inString = true;
      stringChar = ch;
    } else if (inString && ch === stringChar) {
      inString = false;
    }
    if (!inString) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }
    if (ch === "," && depth === 0 && !inString) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function extractParenContent(s: string): string {
  const start = s.indexOf("(");
  const end = s.lastIndexOf(")");
  if (start === -1 || end === -1) return "";
  return s.slice(start + 1, end).trim();
}

function extractParenColumns(s: string): string[] {
  const inner = extractParenContent(s);
  if (!inner) return [];
  return inner.split(",").map((c) => stripIdentifierQuotes(c.trim())).filter(Boolean);
}

// UNIQUE 절에서 (선택적) 제약 이름을 추출한다. 예: `UNIQUE KEY uq_name (a, b)` → "uq_name"
function extractUniqueName(clauseAfterUnique: string): string | null {
  // 선행 KEY/INDEX 키워드 제거 후, 여는 괄호 전의 토큰이 이름
  const head = clauseAfterUnique.replace(/^(KEY|INDEX)\s*/i, "");
  const parenIdx = head.indexOf("(");
  const namePart = (parenIdx === -1 ? head : head.slice(0, parenIdx)).trim();
  return namePart ? stripIdentifierQuotes(namePart) : null;
}

const CONSTRAINT_KEYWORDS = new Set([
  "NOT", "NULL", "DEFAULT", "PRIMARY", "UNIQUE", "REFERENCES",
  "AUTO_INCREMENT", "AUTOINCREMENT", "GENERATED", "CHECK", "COMMENT",
  "CONSTRAINT", "KEY", "INDEX",
]);

/**
 * Removes occurrences of `\s+<keyword><tailRe>` from `s` (case-insensitive keyword match),
 * e.g. `\s+CHARACTER\s+SET\s+\S+`. Locates `keyword` via a plain (non-backtracking) substring
 * search first, then absorbs the mandatory preceding whitespace run manually — this avoids the
 * catastrophic-backtracking shape of a leading unbounded `\s+`/`\s*` quantifier with no anchor,
 * which a naive regex would retry at every position of a long non-matching whitespace run
 * (O(n²) on adversarial input). `tailRe` must match starting exactly where `keyword` ends.
 */
function stripWhitespacePrefixedClause(s: string, keyword: string, tailRe: RegExp, global: boolean): string {
  if (!tailRe.sticky) {
    // `tailRe`는 항상 sticky(`y`)로 선언되어야 한다 — 그래야 이 함수 밖에서 실수로
    // (non-sticky로) 직접 호출되더라도 여러 시작 위치를 재시도하는 O(n²) 백트래킹으로
    // 이어지지 않고, 정규식 리터럴 자체가 구조적으로 안전하다.
    throw new Error("stripWhitespacePrefixedClause: tailRe must be declared with the sticky (y) flag");
  }
  const lower = s.toLowerCase();
  const kw = keyword.toLowerCase();
  const sticky = tailRe;
  let out = "";
  let cursor = 0;
  let searchFrom = 0;
  for (;;) {
    const idx = lower.indexOf(kw, searchFrom);
    if (idx === -1) break;
    const afterKeyword = idx + keyword.length;
    if (idx === 0 || !/\s/.test(s[idx - 1]!)) {
      searchFrom = idx + 1;
      continue;
    }
    sticky.lastIndex = afterKeyword;
    const tailMatch = sticky.exec(s);
    if (!tailMatch) {
      searchFrom = idx + 1;
      continue;
    }
    let wsStart = idx;
    while (wsStart > cursor && /\s/.test(s[wsStart - 1]!)) wsStart--;
    out += s.slice(cursor, wsStart);
    cursor = afterKeyword + tailMatch[0].length;
    searchFrom = cursor;
    if (!global) break;
  }
  out += s.slice(cursor);
  return out;
}

function cleanMySqlType(type: string): string {
  let v = stripWhitespacePrefixedClause(type, "CHARACTER", /\s+SET\s+\S+/iy, true);
  v = stripWhitespacePrefixedClause(v, "COLLATE", /\s+\S+/iy, true);
  return v.trim();
}

function parseColumnType(tokens: string[]): string {
  const typeParts: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i]!;
    const upper = tok.toUpperCase().replaceAll(/[^A-Z_]/g, "");
    if (CONSTRAINT_KEYWORDS.has(upper) && typeParts.length > 0) break;
    typeParts.push(tok);
    i++;
    const prev = tokens[i - 1]!;
    if (prev.includes("(") && !prev.includes(")")) {
      while (i < tokens.length && !tokens[i - 1]!.includes(")")) {
        typeParts.push(tokens[i]!);
        i++;
      }
    }
  }
  return typeParts.join(" ");
}

/**
 * `s`에서 `keyword`가 (작은/큰/백틱 따옴표 문자열 내부가 아닌) 독립된 단어로 처음 등장하는
 * 위치를 찾는다. 예: `COMMENT 'DEFAULT hello'`에서 "DEFAULT"를 찾으면, 그 문자열 리터럴
 * 내부에 있으므로 건너뛰고 -1을 반환한다(실제 DEFAULT 절이 그 뒤에 없다면). 정규식이 아니라
 * 문자 단위 순회라 백트래킹 위험이 없다.
 */
function findKeywordOutsideQuotes(s: string, keyword: string): number {
  const lower = s.toLowerCase();
  const kw = keyword.toLowerCase();
  const isWordChar = (c: string | undefined) => !!c && /\w/.test(c);
  let quoteChar: string | null = null;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (quoteChar) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === quoteChar) quoteChar = null;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quoteChar = ch;
      i++;
      continue;
    }
    if (lower.startsWith(kw, i) && !isWordChar(s[i - 1]) && !isWordChar(s[i + keyword.length])) {
      return i;
    }
    i++;
  }
  return -1;
}

// DEFAULT 값은 quote 문자별로 종료 조건이 다르므로(따옴표 종류마다 이스케이프 규칙이 같음) 하나의
// 거대한 교차 정규식 대신 quote별 소규모 정규식 + 일반 토큰 폴백으로 나눠 복잡도를 낮춘다.
const QUOTED_DEFAULT_RE: Record<string, RegExp> = {
  "'": /^'(?:[^']|\\')*'/,
  '"': /^"(?:[^"]|\\")*"/,
  "`": /^`(?:[^`]|\\`)*`/,
};

/** `DEFAULT\s+` 뒤에 오는 값 하나(quote 문자열 또는 공백 없는 토큰)를 추출한다. */
function matchDefaultValue(afterDefault: string): string | null {
  const first = afterDefault[0];
  const quoteRe = first ? QUOTED_DEFAULT_RE[first] : undefined;
  const quoted = quoteRe?.exec(afterDefault);
  if (quoted) return quoted[0];
  const bare = /^\S+/.exec(afterDefault);
  return bare ? bare[0] : null;
}

const COMMENT_VALUE_RE = /'(?:[^']|\\')*'|"(?:[^"]|\\")*"/y;

/**
 * `afterBody` 안에서 `COMMENT [=] '값'` 또는 `COMMENT [=] "값"` 형태의 테이블 레벨 COMMENT
 * 절을 찾아 따옴표 포함 원문을 반환한다. lookahead로 두 `\s*`를 atomic-group처럼 흉내내는
 * 대신, "COMMENT" 위치를 찾은 뒤 공백/`=`/공백을 직접 건너뛰고 그 지점에 sticky 정규식을
 * 앵커하는 방식이라 정규식 자체의 복잡도가 낮고 백트래킹 모호성이 없다. `findKeywordOutsideQuotes`로
 * 찾으므로 다른 따옴표 문자열(예: 앞선 DEFAULT 값) 내부에 우연히 등장한 "comment"는 무시한다.
 */
function extractQuotedCommentValue(afterBody: string): string | null {
  const idx = findKeywordOutsideQuotes(afterBody, "comment");
  if (idx === -1) return null;
  let i = idx + "comment".length;
  while (i < afterBody.length && /\s/.test(afterBody[i]!)) i++;
  if (afterBody[i] === "=") {
    i++;
    while (i < afterBody.length && /\s/.test(afterBody[i]!)) i++;
  }
  COMMENT_VALUE_RE.lastIndex = i;
  return COMMENT_VALUE_RE.exec(afterBody)?.[0] ?? null;
}

interface ParsedFK {
  constraintName: string;
  srcCols: string[];
  tgtSchema: string | null;
  tgtTable: string;
  tgtCols: string[];
  onDelete: DiagramRelationship["onDelete"];
  onUpdate: DiagramRelationship["onUpdate"];
}

function parseReferentialAction(word: string): DiagramRelationship["onDelete"] {
  switch (word?.toUpperCase()) {
    case "CASCADE": return "cascade";
    case "RESTRICT": return "restrict";
    case "SET": return "set-null";
    case "NO": return "no-action";
    default: return "no-action";
  }
}

function parseFkClause(line: string, constraintName: string): ParsedFK | null {
  const fkMatch = /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)(.*)/i.exec(line);
  if (!fkMatch) return null;

  const srcCols = (fkMatch[1] ?? "").split(",").map((c) => stripIdentifierQuotes(c.trim()));
  const { schema: tgtSchema, name: tgtTable } = parseSchemaAndTable((fkMatch[2] ?? "").trim());
  const tgtCols = (fkMatch[3] ?? "").split(",").map((c) => stripIdentifierQuotes(c.trim()));
  const rest = fkMatch[4] ?? "";

  let onDelete: DiagramRelationship["onDelete"] = "no-action";
  let onUpdate: DiagramRelationship["onUpdate"] = "no-action";

  const delMatch = /ON\s+DELETE\s+(\w+)(?:\s+(\w+))?/i.exec(rest);
  if (delMatch) onDelete = parseReferentialAction(delMatch[1] ?? "");
  const updMatch = /ON\s+UPDATE\s+(\w+)(?:\s+(\w+))?/i.exec(rest);
  if (updMatch) onUpdate = parseReferentialAction(updMatch[1] ?? "");

  return { constraintName, srcCols, tgtSchema, tgtTable, tgtCols, onDelete, onUpdate };
}

interface ParsedUniqueConstraint {
  name: string | null;
  columns: string[];
}

function parseCreateTable(stmt: string): {
  schema: string | null;
  tableName: string;
  tableComment: string | null;
  columns: Omit<DiagramColumn, "id">[];
  fks: ParsedFK[];
  uniqueConstraints: ParsedUniqueConstraint[];
} | null {
  const tableMatch = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(/i.exec(stmt);
  if (!tableMatch) return null;

  const { schema, name: tableName } = parseSchemaAndTable(tableMatch[1] ?? "");

  const bodyStart = stmt.indexOf("(");
  const bodyEnd = stmt.lastIndexOf(")");
  if (bodyStart === -1 || bodyEnd === -1) return null;

  const body = stmt.slice(bodyStart + 1, bodyEnd);
  const lines = splitTopLevelCommas(body);

  const afterBody = stmt.slice(bodyEnd + 1);
  const tableCommentValue = extractQuotedCommentValue(afterBody);
  const tableComment = tableCommentValue?.replaceAll(/^['"]|['"]$/g, "") ?? null;

  const columns: Omit<DiagramColumn, "id">[] = [];
  const fks: ParsedFK[] = [];
  const primaryKeyCols: string[] = [];
  const uniqueCols: string[] = [];
  const uniqueConstraints: ParsedUniqueConstraint[] = [];

  // 단일 컬럼 UNIQUE는 컬럼 boolean으로, 복합(≥2) UNIQUE는 테이블 레벨 제약으로 분류한다.
  const recordUnique = (cols: string[], name: string | null): void => {
    if (cols.length === 1) uniqueCols.push(cols[0]!);
    else if (cols.length > 1) uniqueConstraints.push({ name, columns: cols });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const upperLine = line.toUpperCase();

    if (/^PRIMARY\s+KEY\s*\(/i.test(line)) {
      const inner = extractParenContent(line);
      inner.split(",").forEach((c) => primaryKeyCols.push(stripIdentifierQuotes(c.trim())));
      continue;
    }

    if (/^UNIQUE\s*\(/i.test(line) || /^UNIQUE\s+KEY\b/i.test(line) || /^UNIQUE\s+INDEX\b/i.test(line)) {
      const afterUnique = line.replace(/^UNIQUE\s*/i, "");
      recordUnique(extractParenColumns(line), extractUniqueName(afterUnique));
      continue;
    }

    if (/^CONSTRAINT\s+/i.test(line)) {
      const cnMatch = /^CONSTRAINT\s+([^\s]+)\s+(.*)/i.exec(line);
      if (!cnMatch) continue;
      const cname = stripIdentifierQuotes(cnMatch[1] ?? "");
      const rest = cnMatch[2] ?? "";
      if (/^FOREIGN\s+KEY/i.test(rest)) {
        const fk = parseFkClause(rest, cname);
        if (fk) fks.push(fk);
      } else if (/^PRIMARY\s+KEY/i.test(rest)) {
        const inner = extractParenContent(rest);
        inner.split(",").forEach((c) => primaryKeyCols.push(stripIdentifierQuotes(c.trim())));
      } else if (/^UNIQUE/i.test(rest)) {
        // CONSTRAINT 이름을 복합 UNIQUE 인덱스 이름으로 사용
        recordUnique(extractParenColumns(rest), cname || null);
      }
      continue;
    }

    if (/^FOREIGN\s+KEY\s*\(/i.test(line)) {
      const fk = parseFkClause(line, "");
      if (fk) fks.push(fk);
      continue;
    }

    if (/^(KEY|INDEX|CHECK)\s+/i.test(line)) continue;

    const tokens = line.match(/(?:"[^"]*"|`[^`]*`|'[^']*'|\S+)/g);
    if (!tokens || tokens.length < 2) continue;

    const colName = stripIdentifierQuotes(tokens[0]);
    const typeTokens = tokens.slice(1);
    const colType = cleanMySqlType(parseColumnType(typeTokens));

    const nullable = !/NOT\s+NULL/i.test(upperLine);
    const primaryKey = /\bPRIMARY\s+KEY\b/i.test(upperLine);
    const unique = /\bUNIQUE\b/i.test(upperLine) && !primaryKey;

    // DEFAULT/COMMENT 모두 findKeywordOutsideQuotes로 찾아, 서로의 따옴표 값 안에 우연히
    // 등장한 키워드(예: `COMMENT 'DEFAULT hello'`)를 절로 오인하지 않도록 한다.
    let defaultValue: string | null = null;
    const defIdx = findKeywordOutsideQuotes(line, "DEFAULT");
    if (defIdx !== -1) {
      let j = defIdx + "DEFAULT".length;
      while (j < line.length && /\s/.test(line[j]!)) j++;
      defaultValue = matchDefaultValue(line.slice(j));
    }

    let comment: string | null = null;
    const commentIdx = findKeywordOutsideQuotes(line, "COMMENT");
    if (commentIdx !== -1) {
      let j = commentIdx + "COMMENT".length;
      while (j < line.length && /\s/.test(line[j]!)) j++;
      COMMENT_VALUE_RE.lastIndex = j;
      const commentMatch = COMMENT_VALUE_RE.exec(line);
      if (commentMatch) comment = commentMatch[0].replaceAll(/^['"]|['"]$/g, "");
    }

    const autoIncrement = /\bAUTO_?INCREMENT\b/i.test(upperLine);

    columns.push({ name: colName, type: colType, nullable, primaryKey, unique, defaultValue, comment, autoIncrement, ordinal: columns.length });
  }

  for (const col of columns) {
    if (primaryKeyCols.includes(col.name)) col.primaryKey = true;
    if (uniqueCols.includes(col.name)) col.unique = true;
  }

  return { schema, tableName, tableComment, columns, fks, uniqueConstraints };
}

function parseAlterTableFk(stmt: string): { schema: string | null; tableName: string; fk: ParsedFK } | null {
  const match = /ALTER\s+TABLE\s+([^\s]+)\s+ADD\s+(?:CONSTRAINT\s+([^\s]+)\s+)?FOREIGN\s+KEY(.*)/i.exec(stmt);
  if (!match) return null;

  const { schema, name: tableName } = parseSchemaAndTable(match[1] ?? "");
  const constraintName = match[2] ? stripIdentifierQuotes(match[2]) : "";
  const rest = "FOREIGN KEY" + (match[3] ?? "");
  const fk = parseFkClause(rest, constraintName);
  if (!fk) return null;

  return { schema, tableName, fk };
}

// Splits the inner content of a single VALUES row, stripping string quotes
function splitInsertValues(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let current = "";
  let i = 0;

  while (i < inner.length) {
    const ch = inner[i]!;

    if (!inString && (ch === "'" || ch === '"' || ch === "`")) {
      inString = true;
      stringChar = ch;
      i++;
      continue;
    }

    if (inString) {
      if (ch === stringChar) {
        // Handle SQL escaped quote: '' inside single-quoted strings
        if (ch === "'" && inner[i + 1] === "'") {
          current += "'";
          i += 2;
          continue;
        }
        inString = false;
        i++;
        continue;
      }
      current += ch;
      i++;
      continue;
    }

    if (ch === "(") depth++;
    else if (ch === ")") depth--;

    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
    i++;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

// Finds top-level (...) groups in a VALUES clause and returns their parsed rows
function parseInsertValuesList(valuesStr: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const s = valuesStr.trim();

  while (i < s.length) {
    while (i < s.length && s[i] !== "(") i++;
    if (i >= s.length) break;

    let depth = 0;
    let inString = false;
    let stringChar = "";
    let j = i;

    while (j < s.length) {
      const ch = s[j]!;
      if (!inString && (ch === "'" || ch === '"' || ch === "`")) {
        inString = true;
        stringChar = ch;
      } else if (inString && ch === stringChar) {
        if (ch === "'" && s[j + 1] === "'") { j += 2; continue; }
        inString = false;
      }
      if (!inString) {
        if (ch === "(") depth++;
        else if (ch === ")") {
          depth--;
          if (depth === 0) {
            rows.push(splitInsertValues(s.slice(i + 1, j)));
            i = j + 1;
            break;
          }
        }
      }
      j++;
    }
    if (j >= s.length) break;
  }

  return rows;
}

/**
 * Splits DDL text into statements on ";" characters or a line containing only (optional
 * whitespace +) "GO" (+ optional whitespace) — the T-SQL batch separator. Implemented as a
 * line-by-line scan instead of a single `/;|^\s*GO\s*$/im` regex: that pattern's leading `\s*`
 * (before "GO", anchored per-line via the `m` flag) gets retried at every line-start position of
 * a long run of whitespace-only lines, causing O(n²) backtracking on such (plausible, e.g. blank
 * padding lines in a pasted DDL file) adversarial input. Splitting on "\n" first means each
 * line's `^...$` check is a single anchored, non-repeating attempt.
 */
function splitDdlStatements(sql: string): string[] {
  const goLineRe = /^\s*GO\s*$/i;
  const statements: string[] = [];
  let current = "";
  for (const line of sql.split("\n")) {
    if (goLineRe.test(line)) {
      statements.push(current);
      current = "";
      continue;
    }
    const parts = line.split(";");
    current += parts[0] ?? "";
    for (let i = 1; i < parts.length; i++) {
      statements.push(current);
      current = parts[i] ?? "";
    }
    current += "\n";
  }
  statements.push(current);
  return statements.map((s) => s.trim()).filter(Boolean);
}

/**
 * Applies INSERT INTO seed data from SQL to an existing set of entities (in-place by name match).
 * Use this when importing seed-only SQL files (no CREATE TABLE) to populate existing diagram entities.
 * Returns a new array; unaffected entities are returned as-is (reference-equal).
 */
export function applySeedInserts(sql: string, existingEntities: DiagramEntity[]): DiagramEntity[] {
  const cleaned = removeComments(sql);
  const statements = splitDdlStatements(cleaned);

  // Build a name → entity lookup (same logic as parseDdl's registerEntity/lookupEntity)
  const entityMap = new Map<string, DiagramEntity>();
  for (const entity of existingEntities) {
    if (entity.schema) {
      entityMap.set(`${entity.schema}.${entity.name}`, entity);
      if (!entityMap.has(entity.name)) entityMap.set(entity.name, entity);
    } else {
      entityMap.set(entity.name, entity);
    }
  }

  const lookupEntity = (schema: string | null, tableName: string): DiagramEntity | undefined =>
    schema ? (entityMap.get(`${schema}.${tableName}`) ?? entityMap.get(tableName)) : entityMap.get(tableName);

  // Accumulate new seed rows per entity id
  const seedMap = new Map<string, SeedRow[]>();

  for (const stmt of statements) {
    if (!/^INSERT\s+INTO\s+/i.test(stmt)) continue;
    const m = /^INSERT\s+INTO\s+([^\s(]+)\s*\(([^)]+)\)\s+VALUES\s+([\s\S]+)$/i.exec(stmt);
    if (!m) continue;

    const { schema, name: tableName } = parseSchemaAndTable((m[1] ?? "").trim());
    const entity = lookupEntity(schema, tableName);
    if (!entity) continue;

    const colNames = splitTopLevelCommas(m[2] ?? "").map((c) => stripIdentifierQuotes(c.trim()));
    const valueRows = parseInsertValuesList(m[3] ?? "");

    const rows = seedMap.get(entity.id) ?? [];
    for (const values of valueRows) {
      const row: SeedRow = {};
      for (let i = 0; i < colNames.length && i < values.length; i++) {
        const colName = colNames[i]!;
        // Case-insensitive column lookup (MySQL identifiers are case-insensitive)
        const col = entity.columns.find((c) => c.name.toLowerCase() === colName.toLowerCase());
        if (col) {
          const val = values[i]!;
          if (val.toUpperCase() !== "NULL") row[col.id] = val;
        }
      }
      if (Object.keys(row).length > 0) rows.push(row);
    }
    seedMap.set(entity.id, rows);
  }

  if (seedMap.size === 0) return existingEntities;

  return existingEntities.map((e) => {
    const newRows = seedMap.get(e.id);
    if (!newRows) return e;
    return { ...e, seedData: [...(e.seedData ?? []), ...newRows] };
  });
}

export function parseDdl(sql: string, dialect: DiagramDialect): DiagramDocument {
  const cleaned = removeComments(sql);
  const statements = splitDdlStatements(cleaned);

  // entityMap keyed by both "schema.table" (if schema) and "table" (fallback)
  const entityMap = new Map<string, DiagramEntity>();
  const pendingFks: { sourceSchema: string | null; sourceTable: string; fk: ParsedFK }[] = [];
  const pendingInserts: string[] = [];
  const indexes: DiagramIndex[] = [];

  const registerEntity = (entity: DiagramEntity, schema: string | null, tableName: string) => {
    if (schema) {
      entityMap.set(`${schema}.${tableName}`, entity);
      // Only register unqualified if no collision
      if (!entityMap.has(tableName)) entityMap.set(tableName, entity);
    } else {
      entityMap.set(tableName, entity);
    }
  };

  const lookupEntity = (schema: string | null, tableName: string): DiagramEntity | undefined =>
    (schema ? (entityMap.get(`${schema}.${tableName}`) ?? entityMap.get(tableName)) : entityMap.get(tableName));

  for (const stmt of statements) {
    if (/^CREATE\s+TABLE/i.test(stmt)) {
      const result = parseCreateTable(stmt);
      if (!result) continue;

      const entity: DiagramEntity = {
        id: uuid(),
        schema: result.schema,
        name: result.tableName,
        logicalName: null,
        comment: result.tableComment,
        color: null,
        columns: result.columns.map((c) => ({ ...c, id: uuid() })),
      };
      registerEntity(entity, result.schema, result.tableName);

      // 복합 UNIQUE → DiagramIndex로 보존 (컬럼명을 방금 부여된 컬럼 id로 해석)
      for (const uc of result.uniqueConstraints) {
        const columnIds = uc.columns
          .map((name) => entity.columns.find((c) => c.name === name)?.id)
          .filter((id): id is string => !!id);
        if (columnIds.length < 2) continue; // 복합만 (단일은 컬럼 boolean으로 처리됨)
        indexes.push({
          id: uuid(),
          entityId: entity.id,
          name: uc.name ?? `ux_${result.tableName}_${uc.columns.join("_")}`,
          columnIds,
          unique: true,
        });
      }

      for (const fk of result.fks) {
        pendingFks.push({ sourceSchema: result.schema, sourceTable: result.tableName, fk });
      }
    } else if (/^ALTER\s+TABLE/i.test(stmt)) {
      const result = parseAlterTableFk(stmt);
      if (result) {
        pendingFks.push({ sourceSchema: result.schema, sourceTable: result.tableName, fk: result.fk });
      }
    } else if (/^COMMENT\s+ON\s+TABLE\s+/i.test(stmt)) {
      const m = /COMMENT\s+ON\s+TABLE\s+([^\s]+)\s+IS\s+('(?:[^']|\\')*'|"(?:[^"]|\\")*")/i.exec(stmt);
      if (m) {
        const { schema, name } = parseSchemaAndTable(m[1] ?? "");
        const entity = lookupEntity(schema, name);
        if (entity) entity.comment = (m[2] ?? "").replaceAll(/^['"]|['"]$/g, "");
      }
    } else if (/^COMMENT\s+ON\s+COLUMN\s+/i.test(stmt)) {
      // Handles: schema.table.column or table.column
      const m = /COMMENT\s+ON\s+COLUMN\s+([^\s]+)\s+IS\s+('(?:[^']|\\')*'|"(?:[^"]|\\")*")/i.exec(stmt);
      if (m) {
        const parts = (m[1] ?? "").split(".");
        const colName = stripIdentifierQuotes(parts.at(-1)!);
        const tableRef = parts.slice(0, -1).join(".");
        const { schema, name: tableName } = parseSchemaAndTable(tableRef);
        const entity = lookupEntity(schema, tableName);
        if (entity) {
          const col = entity.columns.find((c) => c.name === colName);
          if (col) col.comment = (m[2] ?? "").replaceAll(/^['"]|['"]$/g, "");
        }
      }
    } else if (/^INSERT\s+INTO\s+/i.test(stmt)) {
      pendingInserts.push(stmt);
    }
  }

  // Second pass: populate seed data from INSERT statements
  for (const stmt of pendingInserts) {
    const m = /^INSERT\s+INTO\s+([^\s(]+)\s*\(([^)]+)\)\s+VALUES\s+([\s\S]+)$/i.exec(stmt);
    if (!m) continue;

    const { schema, name: tableName } = parseSchemaAndTable((m[1] ?? "").trim());
    const entity = lookupEntity(schema, tableName);
    if (!entity) continue;

    const colNames = splitTopLevelCommas(m[2] ?? "").map((c) => stripIdentifierQuotes(c.trim()));
    const valueRows = parseInsertValuesList(m[3] ?? "");

    const seedRows: SeedRow[] = [];
    for (const values of valueRows) {
      const row: SeedRow = {};
      for (let i = 0; i < colNames.length && i < values.length; i++) {
        const colName = colNames[i]!;
        const col = entity.columns.find((c) => c.name === colName);
        if (col) {
          const val = values[i]!;
          if (val.toUpperCase() !== "NULL") row[col.id] = val;
        }
      }
      if (Object.keys(row).length > 0) seedRows.push(row);
    }

    if (seedRows.length > 0) {
      entity.seedData = [...(entity.seedData ?? []), ...seedRows];
    }
  }

  const entities = Array.from(new Set(entityMap.values())); // deduplicate (qualified + unqualified keys)
  const relationships: DiagramRelationship[] = [];

  for (const { sourceSchema, sourceTable, fk } of pendingFks) {
    const srcEntity = lookupEntity(sourceSchema, sourceTable);
    const tgtEntity = lookupEntity(fk.tgtSchema, fk.tgtTable);
    if (!srcEntity || !tgtEntity) continue;

    const srcColIds = fk.srcCols
      .map((name) => srcEntity.columns.find((c) => c.name === name)?.id)
      .filter((id): id is string => !!id);

    const tgtColIds = fk.tgtCols
      .map((name) => tgtEntity.columns.find((c) => c.name === name)?.id)
      .filter((id): id is string => !!id);

    relationships.push({
      id: uuid(),
      name: fk.constraintName || `fk_${srcEntity.name}_${tgtEntity.name}`,
      sourceEntityId: srcEntity.id,
      sourceColumnIds: srcColIds,
      targetEntityId: tgtEntity.id,
      targetColumnIds: tgtColIds,
      cardinality: "many-to-one",
      onDelete: fk.onDelete,
      onUpdate: fk.onUpdate,
      identifying: false,
    });
  }

  // Pack entities into columns
  const NODE_W = 280;
  const COL_GAP = 48;
  const ROW_GAP = 36;
  const N_COLS = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(entities.length))));
  const estimateH = (e: { columns: unknown[] }) => 38 + 28 + e.columns.length * 30 + ROW_GAP;

  const colHeights = new Array<number>(N_COLS).fill(0);
  const entityPositions: Record<string, { x: number; y: number }> = {};
  entities.forEach((e) => {
    const minH = Math.min(...colHeights);
    const col = colHeights.indexOf(minH);
    const y = colHeights[col] ?? 0;
    entityPositions[e.id] = { x: col * (NODE_W + COL_GAP), y };
    colHeights[col] = y + estimateH(e);
  });

  const now = new Date().toISOString();

  return {
    format: "erdify.schema.v1",
    id: uuid(),
    name: "Imported",
    dialect,
    entities,
    relationships,
    indexes,
    views: [],
    layout: { entityPositions },
    metadata: { revision: 1, stableObjectIds: true, createdAt: now, updatedAt: now },
  };
}

import type { DiagramDocument, DiagramDialect, DiagramEntity, DiagramColumn, DiagramRelationship } from "@erdify/domain";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function stripIdentifierQuotes(s: string): string {
  return s.replace(/^["'`]|["'`]$/g, "");
}

function removeComments(sql: string): string {
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  sql = sql.replace(/--[^\n]*/g, "");
  return sql;
}

function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
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

const CONSTRAINT_KEYWORDS = new Set([
  "NOT", "NULL", "DEFAULT", "PRIMARY", "UNIQUE", "REFERENCES",
  "AUTO_INCREMENT", "AUTOINCREMENT", "GENERATED", "CHECK", "COMMENT",
  "CONSTRAINT", "KEY", "INDEX",
]);

function parseColumnType(tokens: string[]): string {
  const typeParts: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i]!;
    const upper = tok.toUpperCase().replace(/[^A-Z_]/g, "");
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

interface ParsedFK {
  constraintName: string;
  srcCols: string[];
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
  const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)(.*)/i);
  if (!fkMatch) return null;

  const srcCols = (fkMatch[1] ?? "").split(",").map((c) => stripIdentifierQuotes(c.trim()));
  const tgtTable = stripIdentifierQuotes((fkMatch[2] ?? "").trim());
  const tgtCols = (fkMatch[3] ?? "").split(",").map((c) => stripIdentifierQuotes(c.trim()));
  const rest = fkMatch[4] ?? "";

  let onDelete: DiagramRelationship["onDelete"] = "no-action";
  let onUpdate: DiagramRelationship["onUpdate"] = "no-action";

  const delMatch = rest.match(/ON\s+DELETE\s+(\w+)(?:\s+(\w+))?/i);
  if (delMatch) {
    onDelete = parseReferentialAction(delMatch[1] ?? "");
  }
  const updMatch = rest.match(/ON\s+UPDATE\s+(\w+)(?:\s+(\w+))?/i);
  if (updMatch) {
    onUpdate = parseReferentialAction(updMatch[1] ?? "");
  }

  return { constraintName, srcCols, tgtTable, tgtCols, onDelete, onUpdate };
}

function parseCreateTable(stmt: string): { tableName: string; columns: Omit<DiagramColumn, "id">[]; fks: ParsedFK[] } | null {
  const tableMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(/i);
  if (!tableMatch) return null;

  const tableName = stripIdentifierQuotes(tableMatch[1] ?? "");

  const bodyStart = stmt.indexOf("(");
  const bodyEnd = stmt.lastIndexOf(")");
  if (bodyStart === -1 || bodyEnd === -1) return null;

  const body = stmt.slice(bodyStart + 1, bodyEnd);
  const lines = splitTopLevelCommas(body);

  const columns: Omit<DiagramColumn, "id">[] = [];
  const fks: ParsedFK[] = [];
  const primaryKeyCols: string[] = [];
  const uniqueCols: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const upperLine = line.toUpperCase();

    if (/^PRIMARY\s+KEY\s*\(/i.test(line)) {
      const inner = extractParenContent(line);
      inner.split(",").forEach((c) => primaryKeyCols.push(stripIdentifierQuotes(c.trim())));
      continue;
    }

    if (/^UNIQUE\s*\(/i.test(line) || /^UNIQUE\s+KEY\s/i.test(line) || /^UNIQUE\s+INDEX\s/i.test(line)) {
      const inner = extractParenContent(line);
      inner.split(",").forEach((c) => uniqueCols.push(stripIdentifierQuotes(c.trim())));
      continue;
    }

    if (/^CONSTRAINT\s+/i.test(line)) {
      const cnMatch = line.match(/^CONSTRAINT\s+([^\s]+)\s+(.*)/i);
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
        const inner = extractParenContent(rest);
        inner.split(",").forEach((c) => uniqueCols.push(stripIdentifierQuotes(c.trim())));
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
    const colType = parseColumnType(typeTokens);

    const upperAll = upperLine;
    const nullable = !/NOT\s+NULL/i.test(upperAll);
    const primaryKey = /\bPRIMARY\s+KEY\b/i.test(upperAll);
    const unique = /\bUNIQUE\b/i.test(upperAll) && !primaryKey;

    let defaultValue: string | null = null;
    const defMatch = line.match(/DEFAULT\s+('(?:[^']|\\')*'|"(?:[^"]|\\")*"|`(?:[^`]|\\`)*`|\S+)/i);
    if (defMatch) {
      defaultValue = defMatch[1] ?? null;
    }

    columns.push({
      name: colName,
      type: colType,
      nullable,
      primaryKey,
      unique,
      defaultValue,
      comment: null,
      ordinal: columns.length,
    });
  }

  for (const col of columns) {
    if (primaryKeyCols.includes(col.name)) col.primaryKey = true;
    if (uniqueCols.includes(col.name)) col.unique = true;
  }

  return { tableName, columns, fks };
}

function parseAlterTableFk(stmt: string): { tableName: string; fk: ParsedFK } | null {
  const match = stmt.match(
    /ALTER\s+TABLE\s+([^\s]+)\s+ADD\s+(?:CONSTRAINT\s+([^\s]+)\s+)?FOREIGN\s+KEY(.*)/i,
  );
  if (!match) return null;

  const tableName = stripIdentifierQuotes(match[1] ?? "");
  const constraintName = match[2] ? stripIdentifierQuotes(match[2]) : "";
  const rest = "FOREIGN KEY" + (match[3] ?? "");
  const fk = parseFkClause(rest, constraintName);
  if (!fk) return null;

  return { tableName, fk };
}

export function parseDdl(sql: string, dialect: DiagramDialect): DiagramDocument {
  const cleaned = removeComments(sql);
  const statements = cleaned.split(";").map((s) => s.trim()).filter(Boolean);

  const entityMap = new Map<string, DiagramEntity>();
  const pendingFks: { sourceTable: string; fk: ParsedFK }[] = [];

  for (const stmt of statements) {
    if (/^CREATE\s+TABLE/i.test(stmt)) {
      const result = parseCreateTable(stmt);
      if (!result) continue;

      const entity: DiagramEntity = {
        id: uuid(),
        name: result.tableName,
        logicalName: null,
        comment: null,
        color: null,
        columns: result.columns.map((c) => ({ ...c, id: uuid() })),
      };
      entityMap.set(result.tableName, entity);

      for (const fk of result.fks) {
        pendingFks.push({ sourceTable: result.tableName, fk });
      }
    } else if (/^ALTER\s+TABLE/i.test(stmt)) {
      const result = parseAlterTableFk(stmt);
      if (result) {
        pendingFks.push({ sourceTable: result.tableName, fk: result.fk });
      }
    }
  }

  const entities = Array.from(entityMap.values());
  const relationships: DiagramRelationship[] = [];

  for (const { sourceTable, fk } of pendingFks) {
    const srcEntity = entityMap.get(sourceTable);
    const tgtEntity = entityMap.get(fk.tgtTable);
    if (!srcEntity || !tgtEntity) continue;

    const srcColIds = fk.srcCols
      .map((name) => srcEntity.columns.find((c) => c.name === name)?.id)
      .filter((id): id is string => !!id);

    const tgtColIds = fk.tgtCols
      .map((name) => tgtEntity.columns.find((c) => c.name === name)?.id)
      .filter((id): id is string => !!id);

    const name =
      fk.constraintName || `fk_${srcEntity.name}_${tgtEntity.name}`;

    relationships.push({
      id: uuid(),
      name,
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

  // Pack entities into columns, accounting for variable table heights
  const NODE_W = 280;
  const COL_GAP = 48;
  const ROW_GAP = 36;
  const N_COLS = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(entities.length))));
  const estimateH = (e: { columns: unknown[] }) =>
    38 + 28 + e.columns.length * 30 + ROW_GAP;

  const colHeights = Array<number>(N_COLS).fill(0);
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
    indexes: [],
    views: [],
    layout: { entityPositions },
    metadata: { revision: 1, stableObjectIds: true, createdAt: now, updatedAt: now },
  };
}

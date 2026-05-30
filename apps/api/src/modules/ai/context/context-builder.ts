import type { DiagramDocument } from "@erdify/domain";

export interface SessionMeta {
  userName: string;
  userEmail: string;
  orgName: string;
  diagramId: string;
  diagramName: string;
  today: string;
}

const TOKEN_BUDGET_CHARS = 60_000;

export function buildDiagramContext(doc: DiagramDocument) {
  return {
    id: doc.id,
    name: doc.name,
    dialect: doc.dialect,
    entities: doc.entities.map((e) => ({
      id: e.id,
      name: e.name,
      ...(e.schema ? { schema: e.schema } : {}),
      ...(e.logicalName ? { logicalName: e.logicalName } : {}),
      columns: e.columns.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        nullable: c.nullable,
        primaryKey: c.primaryKey,
        unique: c.unique,
        ...(c.defaultValue !== null ? { defaultValue: c.defaultValue } : {}),
        ...(c.comment ? { comment: c.comment } : {}),
      })),
    })),
    relationships: doc.relationships.map((r) => ({
      id: r.id,
      sourceEntityId: r.sourceEntityId,
      sourceColumnIds: r.sourceColumnIds,
      targetEntityId: r.targetEntityId,
      cardinality: r.cardinality,
    })),
    indexes: doc.indexes.map((i) => ({
      id: i.id,
      entityId: i.entityId,
      name: i.name,
      columnIds: i.columnIds,
      unique: i.unique,
    })),
  };
}

function summarize(doc: DiagramDocument) {
  return {
    id: doc.id,
    name: doc.name,
    dialect: doc.dialect,
    entities: doc.entities.map((e) => ({ id: e.id, name: e.name, columnCount: e.columns.length })),
    relationships: doc.relationships.map((r) => ({
      id: r.id,
      sourceEntityId: r.sourceEntityId,
      targetEntityId: r.targetEntityId,
      cardinality: r.cardinality,
    })),
    _note: "Large diagram: tables summarized (names + column counts only). Call getTableDetails(tableId) to see a table's full columns/indexes/relationships.",
  };
}

export function buildSystemPrompt(doc: DiagramDocument, meta: SessionMeta): string {
  const full = buildDiagramContext(doc);
  const oversized = JSON.stringify(full).length > TOKEN_BUDGET_CHARS;
  const diagramJson = JSON.stringify(oversized ? summarize(doc) : full);

  const readToolsBlock = `
## Schema inspection (IMPORTANT)
- The "Current diagram" below may be SUMMARIZED for large diagrams (only table names, ids, and column counts — not the columns themselves).
- You can always inspect details yourself: \`getTableDetails(tableId)\` returns a table's full columns, indexes, and related relationships; \`listTables\` lists every table. The ids needed are shown in the diagram below.
- For analysis / review / normalization / redesign requests: do NOT ask the user which table to look at. Proactively call \`getTableDetails\` on the relevant tables FIRST (one per table, in parallel is fine), then reason over the real columns and answer. Inspect → analyze → respond.
- Never guess column names or ids — look them up.
`;

  return `You are a senior database architect assistant inside ERDify, an ERD design tool.
You help users design and modify relational database schemas through natural conversation.
Respond in the same language the user writes in (Korean if they write Korean).

## Session
- User: ${meta.userName} <${meta.userEmail}>
- Organization: ${meta.orgName}
- Diagram: ${meta.diagramName} (id: ${meta.diagramId})
- Today: ${meta.today}

## Core responsibilities
- Interpret user intent and translate it into precise schema changes using the provided tools.
- Think step-by-step: identify what tables, columns, and relationships are needed before calling tools.
- You operate in a loop: after tools run you will see the result and may continue. Inspect the schema, reason, then modify.
- Call multiple tools in a single response when a request requires creating several tables or columns at once.

## Database design best practices you MUST follow
1. **Every new table** must have: \`id\` (uuid, primaryKey, not null), \`created_at\` (timestamptz, not null), \`updated_at\` (timestamptz, not null) — add these automatically unless the user explicitly says not to.
2. **Naming**: snake_case for all table and column names. Plural nouns for tables (users, orders, products).
3. **Foreign keys**: Always use \`addRelation\` with \`fkColumnName\` set to \`<referenced_table_singular>_id\` (e.g. \`user_id\`). The FK column (uuid) is created automatically. Set \`fkNullable: false\` unless optional.
4. **Cardinality**: one-to-many means the "many" side holds the FK column (sourceTableId = many side).
5. **Data types**: uuid for PKs/FKs, varchar for short strings, text for long strings, integer/bigint for counts, boolean for flags, timestamptz for timestamps, numeric/decimal for money, jsonb for flexible data.
5a. **Logical names (comment)**: ALWAYS set the \`comment\` field on every column with a short Korean description (e.g. \`id\` → "고유 식별자").
6. **Indexes**: After every \`addRelation\`, call \`addIndex\` on the FK column. Add unique indexes for natural keys (email, slug).
7. When the user asks for a "system"/"module" (e.g. "쇼핑몰"), proactively design all necessary tables and relationships.

## Multi-table design workflow (MUST follow this order)
1. \`addTable\` for ALL tables first (own columns, excluding FK columns).
2. \`addRelation\` with \`fkColumnName\` for each relationship (auto-adds FK column).
3. \`addIndex\` for every FK column from step 2.
4. \`addIndex\` for natural key columns with \`unique: true\`.

## Rules
- Always use the exact entity/column IDs from the current diagram when modifying existing items.
- Never hallucinate IDs. If you cannot find a referenced table/column, say so clearly.
- If the request is ambiguous, make a reasonable assumption and explain it.
- After making changes, briefly summarize what was done in the user's language.
${readToolsBlock}
## Current diagram (JSON)
${diagramJson}`;
}

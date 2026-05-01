# ERDify

ERDify is a collaborative, web-based ERD (Entity-Relationship Diagram) editor designed for software teams that need to design, document, and share database schemas across projects. It combines a visual canvas editor with an AI-native integration layer so that both humans and LLMs can read and modify diagrams.

## Background

Managing database schemas across multiple client projects is a recurring pain point for product and engineering teams. Schemas live in migration files, ad-hoc SQL scripts, or outdated spreadsheets — none of which are easy to visualize, share, or keep in sync. ERDify centralises this into a single tool: a visual editor with a versioned document model, a REST API, and an MCP server that lets AI assistants (like Claude) read and write diagrams directly.

## Purpose

- Give engineers a fast, keyboard-friendly ERD editor that works in the browser
- Provide a structured, machine-readable schema format (`erdify.schema.v1`) that can be diffed, versioned, and operated on programmatically
- Enable AI-assisted schema design through the Model Context Protocol (MCP), so an LLM can add tables, columns, and relationships on behalf of the user
- Export DDL (CREATE TABLE + ALTER TABLE FK) for PostgreSQL, MySQL, and MariaDB at any time

## Expected Outcomes

| Outcome | How ERDify delivers it |
|---------|----------------------|
| Single source of truth for DB schemas | Versioned `DiagramDocument` stored server-side, editable by team |
| No context-switching for AI users | Claude Desktop can list orgs → projects → diagrams → mutate schema via MCP tools |
| Portable SQL | `generateDdl()` turns any diagram into ready-to-run CREATE TABLE statements |
| Real-time awareness | Collaborator presence and selection highlighted on the canvas |

---

## Architecture

```
apps/
  web/          React + Vite frontend (editor canvas, dashboard)
  api/          NestJS REST API (auth, orgs, projects, diagrams)
  mcp-server/   stdio MCP server for Claude Desktop integration

packages/
  domain/       Canonical DiagramDocument type + pure immutable commands
  erd-ui/       React Flow–based canvas components (TableNode, edges)
  db/           TypeORM entities + migrations
  contracts/    Zod API schemas shared by web and api
```

The `packages/domain` layer is the heart of the system. Both the web editor and the MCP server apply the same pure command functions (`addEntity`, `addColumn`, `addRelationship`, …) to the same `DiagramDocument` type — so schema mutations are consistent regardless of whether they come from a human clicking in the UI or an LLM calling an MCP tool.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Flow (`@xyflow/react`), Zustand, TanStack Query, vanilla-extract |
| Backend | NestJS, TypeORM, PostgreSQL, JWT (via `@nestjs/jwt`) |
| AI integration | `@modelcontextprotocol/sdk` (stdio transport) |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | Vitest |

---

## Features

- **Visual ERD canvas** — drag-and-drop tables, draw relationships, zoom/pan
- **Multi-dialect DDL export** — PostgreSQL, MySQL, MariaDB
- **Organisation / Project / Diagram hierarchy** — mirrors real team structures
- **Real-time collaborator presence** — see which entity a teammate has selected
- **MCP AI integration** — Claude Desktop can read and write your diagrams
- **API Key generation** — long-lived JWT key issued from the dashboard for MCP use

---

## Usage

### Local Development

```bash
# Prerequisites: Node 20+, pnpm 9+, PostgreSQL 15+

pnpm install

# Copy and fill in the environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start API + Web (Turborepo runs both)
pnpm dev

# Or with Docker Compose (includes Postgres)
docker compose up
```

The web app runs on **http://localhost:5173** and the API on **http://localhost:4000**.

### Workspace commands

```bash
pnpm lint          # ESLint across all packages
pnpm typecheck     # tsc --noEmit across all packages
pnpm test          # Vitest across all packages
pnpm build         # Production build
pnpm verify:workspace   # Verify pnpm workspace integrity
pnpm verify:configs     # Verify shared tsconfig/eslint configs
```

### Generating an API Key (for MCP)

1. Open the ERDify web app and sign in
2. Click your avatar (top-right) → **MCP API 키**
3. Click **API 키 생성** — the key is shown once; copy it immediately
4. Use this key as `ERDIFY_API_KEY` in your Claude Desktop config

### Claude Desktop MCP Integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "erdify": {
      "command": "node",
      "args": ["/path/to/ERDify/apps/mcp-server/dist/index.js"],
      "env": {
        "ERDIFY_API_URL": "http://localhost:4000",
        "ERDIFY_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

Then restart Claude Desktop. You can ask Claude:

> "List my ERDify organizations"  
> "Add a `payments` table to diagram `<id>` with columns: id (uuid, PK), amount (integer), created_at (timestamp)"  
> "Generate the DDL for diagram `<id>`"

Available MCP tools: `list_organizations`, `list_projects`, `list_diagrams`, `get_diagram`, `get_ddl`, `add_table`, `remove_table`, `add_column`, `update_column`, `remove_column`, `add_relationship`, `remove_relationship`.

---

## Core Logic

### 1. Immutable Document Model (`packages/domain`)

Every diagram is a plain `DiagramDocument` object. All mutations are pure functions that return a new document — no classes, no mutation, no side effects.

```typescript
// packages/domain/src/types/diagram.type.ts
export interface DiagramDocument {
  format: "erdify.schema.v1";
  id: string;
  name: string;
  dialect: "postgresql" | "mysql" | "mariadb";
  entities: DiagramEntity[];
  relationships: DiagramRelationship[];
  layout: DiagramLayout;       // { entityPositions: Record<id, {x, y}> }
  metadata: DiagramMetadata;   // { revision, createdAt, updatedAt, ... }
  indexes: [];
  views: [];
}
```

Commands spread-update the document — existing entity references are preserved when they're not touched, which is critical for React's `memo` to work correctly:

```typescript
// packages/domain/src/commands/entity-commands.ts
export function addEntity(
  doc: DiagramDocument,
  input: { id: string; name: string; position?: EntityPosition }
): DiagramDocument {
  const entity: DiagramEntity = { id: input.id, name: input.name, logicalName: null, comment: null, columns: [] };
  return {
    ...doc,
    entities: [...doc.entities, entity],
    layout: { ...doc.layout, entityPositions: { ...doc.layout.entityPositions, [input.id]: input.position } },
  };
}

export function removeEntity(doc: DiagramDocument, entityId: string): DiagramDocument {
  const { [entityId]: _removed, ...remainingPositions } = doc.layout.entityPositions;
  return {
    ...doc,
    entities: doc.entities.filter((e) => e.id !== entityId),
    relationships: doc.relationships.filter(
      (r) => r.sourceEntityId !== entityId && r.targetEntityId !== entityId
    ),
    layout: { ...doc.layout, entityPositions: remainingPositions },
  };
}
```

### 2. Incremental React Flow Node Diffing (`apps/web`)

The editor canvas can hold hundreds of tables. Naively converting the full document to React Flow nodes on every command would re-render every `TableNode`. Instead, `updateNodes` does reference-equality diffing — it only creates new node objects for entities whose content or position actually changed. Unchanged entities return their previous node reference, so `React.memo` can skip them.

```typescript
// apps/web/src/features/editor/stores/useEditorStore.ts
function updateNodes(
  prevDoc: DiagramDocument,
  nextDoc: DiagramDocument,
  prevNodes: TableNodeType[],
  collaborators: Collaborator[]
): TableNodeType[] {
  const prevEntityMap = new Map(prevDoc.entities.map((e) => [e.id, e]));
  const prevNodeMap   = new Map(prevNodes.map((n) => [n.id, n]));

  return nextDoc.entities.map((entity) => {
    const prevNode  = prevNodeMap.get(entity.id);
    const collab    = collaborators.find((c) => c.selectedEntityId === entity.id);

    const entitySame   = prevEntityMap.get(entity.id) === entity;           // same object ref
    const positionSame = prevDoc.layout.entityPositions[entity.id]
                      === nextDoc.layout.entityPositions[entity.id];
    const collabSame   = prevNode?.data.collaboratorColor === collab?.color;

    if (prevNode && entitySame && positionSame && collabSame) return prevNode; // memo skips re-render

    return {
      id: entity.id,
      type: "table" as const,
      position: nextDoc.layout.entityPositions[entity.id] ?? { x: 0, y: 0 },
      data: { entity, ...(collab ? { collaboratorColor: collab.color } : {}) },
    };
  });
}
```

Editing one table in a 300-table diagram triggers ~1 re-render instead of 300.

### 3. MCP Write Tool Pattern (`apps/mcp-server`)

Every write tool follows the same three-step pattern: **GET the current diagram → apply a domain command → PATCH it back**. This means the MCP server reuses exactly the same pure functions as the web editor.

```typescript
// apps/mcp-server/src/tools/write-tools.ts
server.tool(
  "add_table",
  "Add a new table to a diagram",
  {
    diagramId: z.string(),
    name: z.string(),
    columns: z.array(columnInputSchema).optional(),
  },
  async ({ diagramId, name, columns }) => {
    const { content: doc } = await client.getDiagram(diagramId);   // GET
    const entityId = randomUUID();
    let updated = addEntity(doc, { id: entityId, name });           // domain command
    if (columns) {
      for (let i = 0; i < columns.length; i++) {
        updated = addColumn(updated, entityId, buildColumn(columns[i]!, i));
      }
    }
    await client.updateDiagram(diagramId, updated);                 // PATCH
    return { content: [{ type: "text", text: `Table "${name}" added.` }] };
  }
);
```

Because all commands are pure and the document is a plain JSON object, the MCP server needs no ORM, no database connection — it just talks to the ERDify REST API.

### 4. DDL Generation (`packages/domain`)

`generateDdl` converts a `DiagramDocument` into SQL. It handles multi-column primary keys, quoting differences between PostgreSQL (double-quotes) and MySQL/MariaDB (backticks), and emits `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` statements after all `CREATE TABLE` statements.

```typescript
// packages/domain/src/utils/ddl-generator.ts
export function generateDdl(doc: DiagramDocument): string {
  const { dialect, entities, relationships } = doc;
  const tableParts = entities.map((e) => entityDdl(e, dialect));
  const fkParts    = relationships.map((r) => fkDdl(r, entities, dialect)).filter(Boolean);
  return [...tableParts, ...fkParts].join("\n\n\n");
}

// Example output (PostgreSQL):
// CREATE TABLE "users" (
//   "id" uuid NOT NULL,
//   "email" varchar NOT NULL UNIQUE,
//   PRIMARY KEY ("id")
// );
//
// ALTER TABLE "posts"
//   ADD CONSTRAINT "fk_posts_users"
//   FOREIGN KEY ("user_id")
//   REFERENCES "users" ("id")
//   ON DELETE CASCADE
//   ON UPDATE NO ACTION;
```

### 5. Long-Lived API Key via JWT (`apps/api`)

MCP clients need a stable credential that doesn't expire. Rather than a separate key table, ERDify issues a long-lived JWT (100-year expiry) signed with the same secret as regular access tokens. The `JwtAuthGuard` validates it identically — no special-casing required.

```typescript
// apps/api/src/modules/auth/auth.service.ts
generateApiKey(userId: string, email: string): { apiKey: string } {
  return { apiKey: this.jwtService.sign({ sub: userId, email }, { expiresIn: "100y" }) };
}

// apps/api/src/modules/auth/auth.controller.ts
@Post("api-key")
@UseGuards(JwtAuthGuard)
generateApiKey(@CurrentUser() user: JwtPayload): { apiKey: string } {
  return this.authService.generateApiKey(user.sub, user.email);
}
```

---

## Apps & Packages

| Path | Description |
|------|-------------|
| `apps/web` | React/Vite frontend — dashboard, ERD canvas editor |
| `apps/api` | NestJS REST API — auth, organizations, projects, diagrams |
| `apps/mcp-server` | stdio MCP server — 12 tools for Claude Desktop |
| `packages/domain` | `DiagramDocument` type, pure commands, DDL generator, validation |
| `packages/erd-ui` | React Flow canvas primitives (`TableNode`, edge types) |
| `packages/db` | TypeORM entities + migration runner |
| `packages/contracts` | Zod schemas for request/response validation (shared) |
| `packages/config-typescript` | Shared `tsconfig` base files |
| `packages/config-eslint` | Shared ESLint config |

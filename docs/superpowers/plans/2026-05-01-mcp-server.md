# ERDify MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude Desktop 등 MCP 클라이언트가 ERDify 다이어그램을 자연어로 읽고 편집할 수 있도록 stdio MCP 서버를 구현한다.

**Architecture:** `apps/mcp-server`를 새 패키지로 추가, `@modelcontextprotocol/sdk`로 stdio MCP 서버 구현. `@erdify/domain` 커맨드를 재사용해 "다이어그램 GET → 도메인 커맨드 적용 → PATCH" 패턴으로 Write를 처리. 인증은 ERDify API에 새로 추가하는 `POST /auth/api-key` 엔드포인트가 발급한 장기 JWT를 환경변수로 주입.

**Tech Stack:** `@modelcontextprotocol/sdk`, `zod`, `tsx` (런타임), `@erdify/domain` (workspace), NestJS (API 변경), TypeScript

---

## File Map

**신규 생성:**
- `apps/mcp-server/package.json`
- `apps/mcp-server/tsconfig.json`
- `apps/mcp-server/src/index.ts` — McpServer 초기화, stdio transport 연결
- `apps/mcp-server/src/client.ts` — ERDify REST API HTTP 클라이언트
- `apps/mcp-server/src/tools/read-tools.ts` — list_projects, list_diagrams, get_diagram, get_ddl
- `apps/mcp-server/src/tools/write-tools.ts` — add_table, remove_table, add_column, update_column, remove_column, add_relationship, remove_relationship
- `packages/domain/src/utils/ddl-generator.ts` — web에서 이전

**수정:**
- `packages/domain/src/index.ts` — generateDdl export 추가
- `apps/web/src/shared/utils/ddl-generator.ts` — @erdify/domain re-export로 교체
- `apps/api/src/modules/auth/auth.service.ts` — generateApiKey() 추가
- `apps/api/src/modules/auth/auth.controller.ts` — POST /auth/api-key 추가
- `apps/api/src/modules/auth/auth.service.spec.ts` — generateApiKey 테스트 추가

---

## Task 1: generateDdl을 @erdify/domain으로 이동

**Files:**
- Create: `packages/domain/src/utils/ddl-generator.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `apps/web/src/shared/utils/ddl-generator.ts`

- [ ] **Step 1: domain 패키지에 ddl-generator 파일 생성**

`packages/domain/src/utils/ddl-generator.ts`:
```typescript
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
```

- [ ] **Step 2: domain/src/index.ts에 generateDdl export 추가**

`packages/domain/src/index.ts` 마지막에 추가:
```typescript
export { generateDdl } from "./utils/ddl-generator.js";
```

- [ ] **Step 3: web의 ddl-generator.ts를 re-export로 교체**

`apps/web/src/shared/utils/ddl-generator.ts` 전체 교체:
```typescript
export { generateDdl } from "@erdify/domain";
```

- [ ] **Step 4: domain 패키지 빌드**

```bash
pnpm --filter @erdify/domain build
```

Expected: 에러 없이 `packages/domain/dist/` 생성

- [ ] **Step 5: 타입체크**

```bash
pnpm --filter @erdify/web typecheck
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add packages/domain/src/utils/ddl-generator.ts packages/domain/src/index.ts apps/web/src/shared/utils/ddl-generator.ts packages/domain/dist
git commit -m "refactor: move generateDdl to @erdify/domain"
```

---

## Task 2: POST /auth/api-key 엔드포인트 추가

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: auth.service.spec.ts에 테스트 추가**

`apps/api/src/modules/auth/auth.service.spec.ts`의 `describe("AuthService"` 블록 안 마지막에 추가:

```typescript
describe("generateApiKey", () => {
  it("signs jwt with 100y expiry and returns apiKey", () => {
    jwtService.sign.mockReturnValue("long-lived-token");
    const result = service.generateApiKey("user-1", "a@b.com");
    expect(result).toEqual({ apiKey: "long-lived-token" });
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: "user-1", email: "a@b.com" },
      { expiresIn: "100y" }
    );
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: `generateApiKey is not a function` 류의 에러로 FAIL

- [ ] **Step 3: auth.service.ts에 generateApiKey 메서드 추가**

`apps/api/src/modules/auth/auth.service.ts`의 `login` 메서드 다음에 추가:

```typescript
generateApiKey(userId: string, email: string): { apiKey: string } {
  return { apiKey: this.jwtService.sign({ sub: userId, email }, { expiresIn: "100y" }) };
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: PASS

- [ ] **Step 5: auth.controller.ts에 엔드포인트 추가**

`apps/api/src/modules/auth/auth.controller.ts` 전체:

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { JwtPayload } from "./strategies/jwt.strategy";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto): Promise<{ accessToken: string }> {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(dto);
  }

  @Post("api-key")
  @UseGuards(JwtAuthGuard)
  generateApiKey(@CurrentUser() user: JwtPayload): { apiKey: string } {
    return this.authService.generateApiKey(user.sub, user.email);
  }
}
```

- [ ] **Step 6: 타입체크**

```bash
pnpm --filter @erdify/api typecheck
```

Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.controller.ts apps/api/src/modules/auth/auth.service.spec.ts
git commit -m "feat(api): add POST /auth/api-key for long-lived JWT generation"
```

---

## Task 3: mcp-server 패키지 스캐폴드

**Files:**
- Create: `apps/mcp-server/package.json`
- Create: `apps/mcp-server/tsconfig.json`

- [ ] **Step 1: package.json 생성**

`apps/mcp-server/package.json`:
```json
{
  "name": "@erdify/mcp-server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@erdify/domain": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@erdify/config-typescript": "workspace:*",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.4",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: tsconfig.json 생성**

`apps/mcp-server/tsconfig.json`:
```json
{
  "extends": "@erdify/config-typescript/node.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 의존성 설치**

```bash
pnpm install
```

Expected: `@modelcontextprotocol/sdk`, `zod` 설치됨

- [ ] **Step 4: src 디렉터리 구조 생성**

```bash
mkdir -p apps/mcp-server/src/tools
```

- [ ] **Step 5: 커밋**

```bash
git add apps/mcp-server/package.json apps/mcp-server/tsconfig.json
git commit -m "chore: scaffold mcp-server package"
```

---

## Task 4: ERDify API 클라이언트 구현

**Files:**
- Create: `apps/mcp-server/src/client.ts`

- [ ] **Step 1: client.ts 생성**

`apps/mcp-server/src/client.ts`:
```typescript
import type { DiagramDocument } from "@erdify/domain";

const API_URL = process.env.ERDIFY_API_URL ?? "http://localhost:3000";
const API_KEY = process.env.ERDIFY_API_KEY ?? "";

export interface ProjectItem {
  id: string;
  name: string;
}

export interface DiagramItem {
  id: string;
  name: string;
  updatedAt: string;
}

export interface DiagramResponse {
  id: string;
  name: string;
  content: DiagramDocument;
  organizationId: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ERDify API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const client = {
  getProjects: () => request<ProjectItem[]>("GET", "/projects"),
  getDiagrams: (projectId: string) =>
    request<DiagramItem[]>("GET", `/projects/${projectId}/diagrams`),
  getDiagram: (diagramId: string) =>
    request<DiagramResponse>("GET", `/diagrams/${diagramId}`),
  updateDiagram: (diagramId: string, content: DiagramDocument) =>
    request<void>("PATCH", `/diagrams/${diagramId}`, { content }),
};
```

- [ ] **Step 2: 타입체크**

```bash
pnpm --filter @erdify/mcp-server typecheck
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/mcp-server/src/client.ts
git commit -m "feat(mcp): ERDify API HTTP client"
```

---

## Task 5: Read 툴 구현

**Files:**
- Create: `apps/mcp-server/src/tools/read-tools.ts`

- [ ] **Step 1: read-tools.ts 생성**

`apps/mcp-server/src/tools/read-tools.ts`:
```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateDdl } from "@erdify/domain";
import type { DiagramDocument } from "@erdify/domain";
import { client } from "../client.js";

function formatDiagram(name: string, doc: DiagramDocument): string {
  const lines: string[] = [`Diagram: "${name}" (${doc.dialect})`, ""];
  lines.push(`Tables (${doc.entities.length}):`);
  for (const entity of doc.entities) {
    lines.push(`  ${entity.name}`);
    for (const col of [...entity.columns].sort((a, b) => a.ordinal - b.ordinal)) {
      const flags = [
        col.primaryKey ? "PK" : null,
        !col.nullable ? "NOT NULL" : null,
        col.unique ? "UNIQUE" : null,
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(`    - ${col.name}: ${col.type}${flags ? " " + flags : ""}`);
    }
  }
  if (doc.relationships.length > 0) {
    lines.push("", `Relationships (${doc.relationships.length}):`);
    for (const rel of doc.relationships) {
      const src = doc.entities.find((e) => e.id === rel.sourceEntityId)?.name ?? rel.sourceEntityId;
      const tgt = doc.entities.find((e) => e.id === rel.targetEntityId)?.name ?? rel.targetEntityId;
      lines.push(`  ${src} → ${tgt} (${rel.cardinality})`);
    }
  }
  return lines.join("\n");
}

export function registerReadTools(server: McpServer): void {
  server.tool(
    "list_projects",
    "List all ERDify projects accessible with the current API key",
    {},
    async () => {
      const projects = await client.getProjects();
      const text =
        projects.length === 0
          ? "No projects found."
          : projects.map((p) => `- ${p.name} (id: ${p.id})`).join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "list_diagrams",
    "List diagrams in a project",
    { projectId: z.string().describe("Project ID from list_projects") },
    async ({ projectId }) => {
      const diagrams = await client.getDiagrams(projectId);
      const text =
        diagrams.length === 0
          ? "No diagrams found."
          : diagrams
              .map((d) => `- ${d.name} (id: ${d.id}, updated: ${d.updatedAt})`)
              .join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_diagram",
    "Get a summary of tables, columns, and relationships in a diagram",
    { diagramId: z.string().describe("Diagram ID from list_diagrams") },
    async ({ diagramId }) => {
      const diagram = await client.getDiagram(diagramId);
      const text = formatDiagram(diagram.name, diagram.content);
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_ddl",
    "Generate DDL SQL for a diagram",
    { diagramId: z.string().describe("Diagram ID from list_diagrams") },
    async ({ diagramId }) => {
      const diagram = await client.getDiagram(diagramId);
      const ddl = generateDdl(diagram.content);
      const text = ddl.trim() || "-- No tables defined";
      return { content: [{ type: "text", text }] };
    }
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm --filter @erdify/mcp-server typecheck
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/mcp-server/src/tools/read-tools.ts
git commit -m "feat(mcp): read tools — list_projects, list_diagrams, get_diagram, get_ddl"
```

---

## Task 6: Write 툴 구현

**Files:**
- Create: `apps/mcp-server/src/tools/write-tools.ts`

- [ ] **Step 1: write-tools.ts 생성**

`apps/mcp-server/src/tools/write-tools.ts`:
```typescript
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addEntity,
  removeEntity,
  addColumn,
  updateColumn,
  removeColumn,
  addRelationship,
  removeRelationship,
} from "@erdify/domain";
import type { DiagramColumn, DiagramRelationship, RelationshipCardinality } from "@erdify/domain";
import { client } from "../client.js";

const columnInputSchema = z.object({
  name: z.string().describe("Column name"),
  type: z.string().describe("SQL type, e.g. varchar, uuid, integer, timestamp"),
  nullable: z.boolean().optional().describe("Defaults to true"),
  primaryKey: z.boolean().optional().describe("Defaults to false"),
  unique: z.boolean().optional().describe("Defaults to false"),
  defaultValue: z.string().optional().describe("SQL default expression"),
});

type ColumnInput = z.infer<typeof columnInputSchema>;

function buildColumn(input: ColumnInput, ordinal: number): DiagramColumn {
  return {
    id: randomUUID(),
    name: input.name,
    type: input.type,
    nullable: input.nullable ?? true,
    primaryKey: input.primaryKey ?? false,
    unique: input.unique ?? false,
    defaultValue: input.defaultValue ?? null,
    comment: null,
    ordinal,
  };
}

export function registerWriteTools(server: McpServer): void {
  server.tool(
    "add_table",
    "Add a new table to a diagram",
    {
      diagramId: z.string(),
      name: z.string().describe("Table name"),
      columns: z.array(columnInputSchema).optional().describe("Initial columns"),
    },
    async ({ diagramId, name, columns }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entityId = randomUUID();
      let updated = addEntity(doc, { id: entityId, name });
      if (columns) {
        for (let i = 0; i < columns.length; i++) {
          updated = addColumn(updated, entityId, buildColumn(columns[i]!, i));
        }
      }
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Table "${name}" added.` }] };
    }
  );

  server.tool(
    "remove_table",
    "Remove a table from a diagram by name",
    {
      diagramId: z.string(),
      tableName: z.string().describe("Exact table name"),
    },
    async ({ diagramId, tableName }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.name === tableName);
      if (!entity) throw new Error(`Table "${tableName}" not found in diagram`);
      const updated = removeEntity(doc, entity.id);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Table "${tableName}" removed.` }] };
    }
  );

  server.tool(
    "add_column",
    "Add a column to an existing table",
    {
      diagramId: z.string(),
      tableName: z.string(),
      column: columnInputSchema,
    },
    async ({ diagramId, tableName, column }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.name === tableName);
      if (!entity) throw new Error(`Table "${tableName}" not found in diagram`);
      const ordinal = entity.columns.length;
      const updated = addColumn(doc, entity.id, buildColumn(column, ordinal));
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Column "${column.name}" added to "${tableName}".` }] };
    }
  );

  server.tool(
    "update_column",
    "Update properties of an existing column",
    {
      diagramId: z.string(),
      tableName: z.string(),
      columnName: z.string(),
      updates: columnInputSchema.partial(),
    },
    async ({ diagramId, tableName, columnName, updates }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.name === tableName);
      if (!entity) throw new Error(`Table "${tableName}" not found`);
      const col = entity.columns.find((c) => c.name === columnName);
      if (!col) throw new Error(`Column "${columnName}" not found in "${tableName}"`);
      const changes: Partial<Omit<DiagramColumn, "id">> = {};
      if (updates.name !== undefined) changes.name = updates.name;
      if (updates.type !== undefined) changes.type = updates.type;
      if (updates.nullable !== undefined) changes.nullable = updates.nullable;
      if (updates.primaryKey !== undefined) changes.primaryKey = updates.primaryKey;
      if (updates.unique !== undefined) changes.unique = updates.unique;
      if (updates.defaultValue !== undefined) changes.defaultValue = updates.defaultValue;
      const updated = updateColumn(doc, entity.id, col.id, changes);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Column "${columnName}" updated.` }] };
    }
  );

  server.tool(
    "remove_column",
    "Remove a column from a table",
    {
      diagramId: z.string(),
      tableName: z.string(),
      columnName: z.string(),
    },
    async ({ diagramId, tableName, columnName }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.name === tableName);
      if (!entity) throw new Error(`Table "${tableName}" not found`);
      const col = entity.columns.find((c) => c.name === columnName);
      if (!col) throw new Error(`Column "${columnName}" not found in "${tableName}"`);
      const updated = removeColumn(doc, entity.id, col.id);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Column "${columnName}" removed from "${tableName}".` }] };
    }
  );

  server.tool(
    "add_relationship",
    "Add a foreign key relationship between two tables",
    {
      diagramId: z.string(),
      sourceTable: z.string().describe("Table that holds the foreign key"),
      targetTable: z.string().describe("Table being referenced"),
      cardinality: z
        .enum(["one-to-one", "one-to-many", "many-to-one"])
        .describe("Relationship cardinality"),
    },
    async ({ diagramId, sourceTable, targetTable, cardinality }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const sourceEntity = doc.entities.find((e) => e.name === sourceTable);
      const targetEntity = doc.entities.find((e) => e.name === targetTable);
      if (!sourceEntity) throw new Error(`Table "${sourceTable}" not found`);
      if (!targetEntity) throw new Error(`Table "${targetTable}" not found`);
      const relationship: DiagramRelationship = {
        id: randomUUID(),
        name: "",
        sourceEntityId: sourceEntity.id,
        sourceColumnIds: [],
        targetEntityId: targetEntity.id,
        targetColumnIds: [],
        cardinality: cardinality as RelationshipCardinality,
        onDelete: "no-action",
        onUpdate: "no-action",
      };
      const updated = addRelationship(doc, relationship);
      await client.updateDiagram(diagramId, updated);
      return {
        content: [
          { type: "text", text: `Relationship ${sourceTable} → ${targetTable} (${cardinality}) added.` },
        ],
      };
    }
  );

  server.tool(
    "remove_relationship",
    "Remove a relationship between two tables (removes first match if multiple exist)",
    {
      diagramId: z.string(),
      sourceTable: z.string(),
      targetTable: z.string(),
    },
    async ({ diagramId, sourceTable, targetTable }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const sourceEntity = doc.entities.find((e) => e.name === sourceTable);
      const targetEntity = doc.entities.find((e) => e.name === targetTable);
      if (!sourceEntity) throw new Error(`Table "${sourceTable}" not found`);
      if (!targetEntity) throw new Error(`Table "${targetTable}" not found`);
      const rel = doc.relationships.find(
        (r) => r.sourceEntityId === sourceEntity.id && r.targetEntityId === targetEntity.id
      );
      if (!rel)
        throw new Error(`No relationship found from "${sourceTable}" to "${targetTable}"`);
      const updated = removeRelationship(doc, rel.id);
      await client.updateDiagram(diagramId, updated);
      return {
        content: [{ type: "text", text: `Relationship ${sourceTable} → ${targetTable} removed.` }],
      };
    }
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm --filter @erdify/mcp-server typecheck
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/mcp-server/src/tools/write-tools.ts
git commit -m "feat(mcp): write tools — add/remove table, column, relationship"
```

---

## Task 7: MCP 서버 진입점 구현 및 연결 확인

**Files:**
- Create: `apps/mcp-server/src/index.ts`

- [ ] **Step 1: index.ts 생성**

`apps/mcp-server/src/index.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerReadTools } from "./tools/read-tools.js";
import { registerWriteTools } from "./tools/write-tools.js";

const server = new McpServer({
  name: "erdify",
  version: "0.1.0",
});

registerReadTools(server);
registerWriteTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: 타입체크**

```bash
pnpm --filter @erdify/mcp-server typecheck
```

Expected: 에러 없음

- [ ] **Step 3: 서버 기동 확인 (stdin 없이 실행, 곧바로 종료됨)**

```bash
echo '{}' | pnpm --filter @erdify/mcp-server dev 2>&1 | head -5
```

Expected: 크래시 없이 JSON-RPC 응답 또는 무음 종료

- [ ] **Step 4: Claude Desktop 설정 안내 문서 추가**

`apps/mcp-server/README.md`:
```markdown
# ERDify MCP Server

ERDify 다이어그램을 Claude Desktop 등 MCP 클라이언트에서 조작할 수 있게 하는 stdio MCP 서버.

## 1. API 키 발급

ERDify에 로그인한 뒤 아래 요청을 보내세요 (Authorization 헤더에 기존 액세스 토큰 사용):

```bash
curl -X POST http://localhost:3000/auth/api-key \
  -H "Authorization: Bearer <your-access-token>"
```

응답: `{ "apiKey": "eyJ..." }`

## 2. Claude Desktop 설정

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/apps/mcp-server/src/index.ts"],
      "env": {
        "ERDIFY_API_URL": "http://localhost:3000",
        "ERDIFY_API_KEY": "eyJ..."
      }
    }
  }
}
```

Claude Desktop을 재시작하면 ERDify 툴이 활성화됩니다.

## 사용 예시

- "내 프로젝트 목록 보여줘" → `list_projects`
- "쇼핑몰 ERD의 테이블 목록 알려줘" → `list_diagrams` → `get_diagram`
- "users 테이블에 email 컬럼 추가해줘" → `add_column`
- "orders → users 관계 추가해줘" → `add_relationship`
- "현재 스키마 DDL 뽑아줘" → `get_ddl`
```

- [ ] **Step 5: 최종 커밋**

```bash
git add apps/mcp-server/src/index.ts apps/mcp-server/README.md
git commit -m "feat(mcp): wire up MCP server entry point and add README"
```

---

## 완료 후 확인

1. ERDify API 서버 실행 중인 상태에서 API 키 발급:
   ```bash
   curl -X POST http://localhost:3000/auth/api-key \
     -H "Authorization: Bearer <token>"
   ```

2. 환경변수 설정 후 MCP 서버 기동:
   ```bash
   ERDIFY_API_URL=http://localhost:3000 ERDIFY_API_KEY=eyJ... \
     pnpm --filter @erdify/mcp-server dev
   ```

3. Claude Desktop config 업데이트 → 재시작 → 대화에서 ERDify 툴 확인

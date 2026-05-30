# AI Chat Context & Streaming Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 채팅을 단발 호출에서 SSE 스트리밍 에이전트 루프로 바꾸고, 전체 다이어그램 + 세션 메타를 system prompt에 주입하며, 선택적 읽기 도구를 토글로 제공한다.

**Architecture:** NestJS `ai` 모듈 내부를 chat / providers / context / tools 로 책임 분리. 에이전트 루프가 provider-정규화된 스트리밍 turn을 반복 호출하면서 도구 결과를 모델에 다시 먹인다. 컨트롤러는 `@Res()` express Response로 SSE 청크를 직접 write. 프론트는 `fetch` + `ReadableStream`으로 소비하며 단계별 진행을 표시.

**Tech Stack:** NestJS, TypeORM, `@anthropic-ai/sdk` (messages.stream), `openai` (stream:true), React + Zustand, vitest.

**Spec:** `docs/superpowers/specs/2026-05-30-ai-chat-context-streaming-design.md`

**Key decisions captured during planning:**
- SSE는 `event:` 라인 대신 **`data: {json}\n\n`** 단일 라인으로 보낸다. 이벤트 타입은 JSON `type` 필드에 담아 프론트 파싱을 단순화.
- 글로벌 prefix는 `/api` (main.ts), 인증은 httpOnly 쿠키 `access_token` → 프론트 fetch는 `credentials:"include"`.
- compression 미들웨어가 전역 적용됨 → SSE 응답에 `Cache-Control: no-cache, no-transform` 헤더로 압축 우회 + `res.flushHeaders()`.
- **히스토리 복원 범위:** 한 요청 내 루프는 tool_use/tool_result 정식 스레딩. 과거 메시지(다른 요청)는 dangling tool_use 에러를 피하려고 **assistant 텍스트 + 적용 요약**으로 복원(별도 저장/마이그레이션 없음). 스펙 §4를 이 결정에 맞게 갱신함.

---

## File Structure

**Backend (`apps/api/src/modules/ai/`):**
- Create `providers/provider.types.ts` — ConvMessage / ProviderTurn / AiProvider 인터페이스
- Create `providers/anthropic.provider.ts` — Anthropic 스트리밍 구현
- Create `providers/openai.provider.ts` — OpenAI 스트리밍 구현
- Create `context/context-builder.ts` — 순수 함수: buildSystemPrompt / buildDiagramContext / buildSessionMeta 직렬화
- Create `tools/read-tools.ts` — listTables / getTableDetails 도구 정의
- Create `tools/tool-executor.ts` — `@Injectable() ToolExecutor` (mutate + read 실행, ai.service의 executeTool 이관)
- Create `chat/ai-chat.service.ts` — `@Injectable() AiChatService.runChat()` 에이전트 루프
- Create `dto/chat-stream.dto.ts` — `AiChatStreamDto`
- Modify `ai.controller.ts` — `POST ai/chat` 제거, `POST ai/chat/stream` 추가
- Modify `ai.service.ts` — chat()/callAnthropic/callOpenAI/executeTool/buildDiagramContext 제거. settings·suggestColumns·공용 헬퍼(public화) 유지
- Modify `ai.module.ts` — User/Organization 엔티티 추가, 신규 provider 등록
- Delete `dto/chat.dto.ts` (AiChatDto 미사용)

**Contracts (`packages/contracts/src/ai/`):**
- Modify `ai.types.ts` — `AiStreamEvent` 추가
- Modify `packages/contracts/src/index.ts` — `AiStreamEvent` export

**Frontend (`apps/web/src/features/ai/`):**
- Modify `api/ai.api.ts` — `sendAiChat` 제거, `streamAiChat` 추가
- Modify `store/aiChatSlice.ts` — 스트리밍 상태 + `enableReadTools` 토글
- Modify `components/FloatingAIChat.tsx` — 스트림 소비 + 토글 UI + 단계 표시

---

## Backend

### Task 1: Contracts — AiStreamEvent

**Files:**
- Modify: `packages/contracts/src/ai/ai.types.ts`
- Modify: `packages/contracts/src/index.ts:`(ai export 블록)

- [ ] **Step 1: Add the stream event union to `ai.types.ts`** (append after `AiChatResponse`)

```ts
export type AiStreamEvent =
  | { type: "step"; text: string }
  | { type: "tool_call"; name: string; label: string }
  | { type: "tool_result"; change: DiffChange }
  | { type: "done"; messageId: string; content: string; diff: DiffChange[] | null; pendingDocument: DiagramDocument | null }
  | { type: "error"; message: string };
```

- [ ] **Step 2: Export it from the barrel** — in `packages/contracts/src/index.ts` add `AiStreamEvent` to the existing `export type { ... } from "./ai/ai.types";` block.

- [ ] **Step 3: Build contracts**

Run: `pnpm --filter @erdify/contracts build`
Expected: PASS (no type errors)

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/src/ai/ai.types.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): add AiStreamEvent for AI chat streaming"
```

---

### Task 2: Context Builder (pure functions)

**Files:**
- Create: `apps/api/src/modules/ai/context/context-builder.ts`
- Test: `apps/api/src/modules/ai/context/context-builder.spec.ts`

Session meta shape:
```ts
export interface SessionMeta {
  userName: string;
  userEmail: string;
  orgName: string;
  diagramId: string;
  diagramName: string;
  today: string; // ISO date
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildDiagramContext } from "./context-builder";
import type { DiagramDocument } from "@erdify/domain";

const doc: DiagramDocument = {
  format: "erdify.schema.v1", id: "d1", name: "shop", dialect: "postgresql",
  entities: [{
    id: "e1", name: "users", schema: null, logicalName: null, comment: null, color: null,
    columns: [{ id: "c1", name: "id", type: "uuid", nullable: false, primaryKey: true, unique: false, defaultValue: null, comment: "고유 식별자", ordinal: 0 }],
  }],
  relationships: [], indexes: [{ id: "i1", entityId: "e1", name: "idx_users_id", columnIds: ["c1"], unique: true }],
  views: [], layout: { entityPositions: {} }, metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
};
const meta = { userName: "홍길동", userEmail: "a@b.com", orgName: "Acme", diagramId: "d1", diagramName: "shop", today: "2026-05-30" };

describe("buildDiagramContext", () => {
  it("모든 테이블을 상세히 포함하고 comment와 인덱스를 담는다", () => {
    const ctx = buildDiagramContext(doc);
    expect(ctx.entities[0].columns[0].comment).toBe("고유 식별자");
    expect(ctx.indexes[0].name).toBe("idx_users_id");
  });
});

describe("buildSystemPrompt", () => {
  it("세션 메타와 다이어그램 JSON을 포함한다", () => {
    const p = buildSystemPrompt(doc, meta, false);
    expect(p).toContain("홍길동");
    expect(p).toContain("a@b.com");
    expect(p).toContain("Acme");
    expect(p).toContain("users");
  });
  it("enableReadTools가 true면 읽기 도구 안내를 포함한다", () => {
    expect(buildSystemPrompt(doc, meta, true)).toContain("listTables");
    expect(buildSystemPrompt(doc, meta, false)).not.toContain("listTables");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/context/context-builder.spec.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `context-builder.ts`**

```ts
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
        id: c.id, name: c.name, type: c.type,
        nullable: c.nullable, primaryKey: c.primaryKey, unique: c.unique,
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
      id: i.id, entityId: i.entityId, name: i.name, columnIds: i.columnIds, unique: i.unique,
    })),
  };
}

function summarize(doc: DiagramDocument) {
  return {
    id: doc.id, name: doc.name, dialect: doc.dialect,
    entities: doc.entities.map((e) => ({ id: e.id, name: e.name, columnCount: e.columns.length })),
    relationships: doc.relationships.map((r) => ({ id: r.id, sourceEntityId: r.sourceEntityId, targetEntityId: r.targetEntityId, cardinality: r.cardinality })),
    _note: "Large diagram: tables summarized. Use listTables/getTableDetails to inspect specific tables in detail.",
  };
}

export function buildSystemPrompt(doc: DiagramDocument, meta: SessionMeta, enableReadTools: boolean): string {
  const full = buildDiagramContext(doc);
  const oversized = JSON.stringify(full).length > TOKEN_BUDGET_CHARS;
  const diagramJson = JSON.stringify(oversized ? summarize(doc) : full);

  const readToolsBlock = enableReadTools
    ? `\n## Schema exploration tools\n- You have \`listTables\` and \`getTableDetails(tableId)\`. When a table is shown only as a summary (large diagram) or you need to double-check exact column/ID details before editing, call them first. Do not guess IDs.\n`
    : "";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/context/context-builder.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/ai/context/
git commit -m "feat(ai): add pure context-builder with full diagram + session meta"
```

---

### Task 3: Read tools + Tool Executor

**Files:**
- Create: `apps/api/src/modules/ai/tools/read-tools.ts`
- Create: `apps/api/src/modules/ai/tools/tool-executor.ts`
- Test: `apps/api/src/modules/ai/tools/tool-executor.spec.ts`

`tool-executor.ts` ports the entire `switch` from `ai.service.ts:312-467` and adds read tools. Execute signature returns a `resultText` (fed back to the model as tool_result) plus the mutated doc and DiffChanges.

- [ ] **Step 1: Create `read-tools.ts`**

```ts
import type { Tool } from "@anthropic-ai/sdk/resources";

export const READ_TOOLS: Tool[] = [
  {
    name: "listTables",
    description: "List all tables in the current diagram with their id and column count. Use to discover what exists.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "getTableDetails",
    description: "Get full details (columns with ids/types, indexes, related relationships) for one table by its id.",
    input_schema: {
      type: "object",
      properties: { tableId: { type: "string", description: "ID of the table to inspect" } },
      required: ["tableId"],
    },
  },
];
```

- [ ] **Step 2: Write the failing test for the executor**

```ts
import { describe, it, expect } from "vitest";
import { ToolExecutor } from "./tool-executor";
import { DomainLoaderService } from "../../../common/services/domain-loader.service";
import type { DiagramDocument } from "@erdify/domain";

const baseDoc: DiagramDocument = {
  format: "erdify.schema.v1", id: "d1", name: "shop", dialect: "postgresql",
  entities: [{ id: "e1", name: "users", schema: null, logicalName: null, comment: null, color: null,
    columns: [{ id: "c1", name: "id", type: "uuid", nullable: false, primaryKey: true, unique: false, defaultValue: null, comment: null, ordinal: 0 }] }],
  relationships: [], indexes: [], views: [], layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
};

const executor = new ToolExecutor(new DomainLoaderService());

describe("ToolExecutor", () => {
  it("addTable이 엔티티를 추가하고 DiffChange를 반환한다", async () => {
    const res = await executor.execute("addTable", { name: "orders" }, baseDoc);
    expect(res.doc.entities).toHaveLength(2);
    expect(res.changes[0]).toMatchObject({ type: "addTable", tableName: "orders" });
    expect(res.resultText).toContain("orders");
  });

  it("listTables는 문서를 바꾸지 않고 테이블 목록 JSON을 반환한다", async () => {
    const res = await executor.execute("listTables", {}, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.doc).toBe(baseDoc);
    expect(res.resultText).toContain("users");
  });

  it("getTableDetails는 컬럼 상세를 반환한다", async () => {
    const res = await executor.execute("getTableDetails", { tableId: "e1" }, baseDoc);
    expect(res.resultText).toContain("c1");
    expect(res.changes).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/tools/tool-executor.spec.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement `tool-executor.ts`**

Port the `switch` body verbatim from `ai.service.ts:312-467` into `private async executeMutation(...)`. Add `resultText` and read tools. Full file:

```ts
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { DiagramDocument, DiagramColumn, DiagramIndex, DiagramRelationship, RelationshipCardinality } from "@erdify/domain";
import type { DiffChange } from "@erdify/contracts";
import { DomainLoaderService } from "../../../common/services/domain-loader.service";

export interface ToolResult {
  doc: DiagramDocument;
  changes: DiffChange[];
  resultText: string;
}

@Injectable()
export class ToolExecutor {
  constructor(private readonly domainLoader: DomainLoaderService) {}

  async execute(toolName: string, input: Record<string, unknown>, doc: DiagramDocument): Promise<ToolResult> {
    if (toolName === "listTables") {
      const tables = doc.entities.map((e) => ({ id: e.id, name: e.name, columnCount: e.columns.length }));
      return { doc, changes: [], resultText: JSON.stringify(tables) };
    }
    if (toolName === "getTableDetails") {
      const tableId = input["tableId"] as string;
      const e = doc.entities.find((x) => x.id === tableId);
      if (!e) return { doc, changes: [], resultText: `Table ${tableId} not found.` };
      const rels = doc.relationships.filter((r) => r.sourceEntityId === tableId || r.targetEntityId === tableId);
      const indexes = doc.indexes.filter((i) => i.entityId === tableId);
      return { doc, changes: [], resultText: JSON.stringify({ id: e.id, name: e.name, columns: e.columns, indexes, relationships: rels }) };
    }
    return this.executeMutation(toolName, input, doc);
  }

  private async executeMutation(toolName: string, input: Record<string, unknown>, doc: DiagramDocument): Promise<ToolResult> {
    const domain = await this.domainLoader.load();
    const changes: DiffChange[] = [];
    let updatedDoc = doc;

    switch (toolName) {
      // ⬇️ PORT VERBATIM from ai.service.ts:313-466 (every case), unchanged.
      // (addTable, removeTable, updateTable, addColumn, removeColumn,
      //  updateColumn, addRelation, removeRelation, addIndex)
    }

    const resultText = changes.length > 0
      ? `Applied: ${changes.map(describeChange).join("; ")}`
      : `No change applied for ${toolName}. The referenced table/column may not exist.`;
    return { doc: updatedDoc, changes, resultText };
  }
}

function describeChange(c: DiffChange): string {
  switch (c.type) {
    case "addTable": return `added table ${c.tableName}`;
    case "removeTable": return `removed table ${c.tableName}`;
    case "updateTable": return `renamed ${c.oldName} -> ${c.newName}`;
    case "addColumn": return `added column ${c.tableName}.${c.columnName}`;
    case "removeColumn": return `removed column ${c.tableName}.${c.columnName}`;
    case "updateColumn": return `updated column ${c.tableName}.${c.columnName}`;
    case "addRelation": return `added relation ${c.fromTable}->${c.toTable}`;
    case "removeRelation": return `removed relation ${c.fromTable}->${c.toTable}`;
    case "addIndex": return `added index ${c.indexName} on ${c.tableName}`;
  }
}
```

> Note: imports `DiagramColumn`/`DiagramIndex`/`DiagramRelationship`/`RelationshipCardinality` are used by the ported cases — keep them.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/tools/tool-executor.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/ai/tools/
git commit -m "feat(ai): extract ToolExecutor and add read tools (listTables/getTableDetails)"
```

---

### Task 4: Provider abstraction (streaming)

**Files:**
- Create: `apps/api/src/modules/ai/providers/provider.types.ts`
- Create: `apps/api/src/modules/ai/providers/anthropic.provider.ts`
- Create: `apps/api/src/modules/ai/providers/openai.provider.ts`
- Test: `apps/api/src/modules/ai/providers/openai.provider.spec.ts` (stream parsing via mock)

- [ ] **Step 1: Create `provider.types.ts`**

```ts
import type { Tool } from "@anthropic-ai/sdk/resources";

export interface NormalizedToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ConvMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; text: string; toolCalls: NormalizedToolCall[] }
  | { role: "tool"; results: { toolCallId: string; toolName: string; content: string }[] };

export interface ProviderTurn {
  text: string;
  toolCalls: NormalizedToolCall[];
}

export interface StreamTurnArgs {
  apiKey: string;
  model: string;
  system: string;
  messages: ConvMessage[];
  tools: Tool[];
  maxTokens: number;
  onText: (delta: string) => void;
}

export interface AiProvider {
  streamTurn(args: StreamTurnArgs): Promise<ProviderTurn>;
}
```

- [ ] **Step 2: Implement `anthropic.provider.ts`**

```ts
import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, StreamTurnArgs, ProviderTurn, ConvMessage } from "./provider.types";

function toAnthropicMessages(messages: ConvMessage[]): Anthropic.MessageParam[] {
  return messages.map((m): Anthropic.MessageParam => {
    if (m.role === "user") return { role: "user", content: m.content };
    if (m.role === "assistant") {
      const blocks: Anthropic.ContentBlockParam[] = [];
      if (m.text) blocks.push({ type: "text", text: m.text });
      for (const tc of m.toolCalls) blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
      return { role: "assistant", content: blocks.length ? blocks : "" };
    }
    return {
      role: "user",
      content: m.results.map((r) => ({ type: "tool_result" as const, tool_use_id: r.toolCallId, content: r.content })),
    };
  });
}

@Injectable()
export class AnthropicProvider implements AiProvider {
  async streamTurn(args: StreamTurnArgs): Promise<ProviderTurn> {
    const client = new Anthropic({ apiKey: args.apiKey });
    const stream = client.messages.stream({
      model: args.model,
      max_tokens: args.maxTokens,
      system: args.system,
      tools: args.tools,
      messages: toAnthropicMessages(args.messages),
    });
    stream.on("text", (delta: string) => args.onText(delta));
    const final = await stream.finalMessage();
    const text = final.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const toolCalls = final.content
      .filter((b) => b.type === "tool_use")
      .map((b) => { const t = b as { id: string; name: string; input: Record<string, unknown> }; return { id: t.id, name: t.name, input: t.input }; });
    return { text, toolCalls };
  }
}
```

- [ ] **Step 3: Implement `openai.provider.ts`**

```ts
import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import type { AiProvider, StreamTurnArgs, ProviderTurn, ConvMessage } from "./provider.types";

function toOpenAiMessages(system: string, messages: ConvMessage[]): OpenAI.ChatCompletionMessageParam[] {
  const out: OpenAI.ChatCompletionMessageParam[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") { out.push({ role: "user", content: m.content }); continue; }
    if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.text || null,
        ...(m.toolCalls.length ? { tool_calls: m.toolCalls.map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.name, arguments: JSON.stringify(tc.input) } })) } : {}),
      });
      continue;
    }
    for (const r of m.results) out.push({ role: "tool", tool_call_id: r.toolCallId, content: r.content });
  }
  return out;
}

export function toOpenAiTools(tools: { name: string; description?: string; input_schema: unknown }[]) {
  return tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description ?? "", parameters: t.input_schema as Record<string, unknown> } }));
}

@Injectable()
export class OpenAiProvider implements AiProvider {
  async streamTurn(args: StreamTurnArgs): Promise<ProviderTurn> {
    const client = new OpenAI({ apiKey: args.apiKey });
    const isNewModel = /^gpt-5/.test(args.model);
    const stream = await client.chat.completions.create({
      model: args.model,
      ...(isNewModel ? { max_completion_tokens: args.maxTokens } : { max_tokens: args.maxTokens }),
      tools: toOpenAiTools(args.tools),
      messages: toOpenAiMessages(args.system, args.messages),
      stream: true,
    });

    let text = "";
    const acc = new Map<number, { id: string; name: string; args: string }>();
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) { text += delta.content; args.onText(delta.content); }
      for (const tc of delta?.tool_calls ?? []) {
        const cur = acc.get(tc.index) ?? { id: "", name: "", args: "" };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        acc.set(tc.index, cur);
      }
    }
    const toolCalls = [...acc.values()].map((t) => ({ id: t.id, name: t.name, input: JSON.parse(t.args || "{}") as Record<string, unknown> }));
    return { text, toolCalls };
  }
}
```

- [ ] **Step 4: Write a test for OpenAI message/tool conversion** (pure, no network)

`openai.provider.spec.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toOpenAiTools } from "./openai.provider";

describe("toOpenAiTools", () => {
  it("Anthropic tool 정의를 OpenAI function 형식으로 변환한다", () => {
    const out = toOpenAiTools([{ name: "addTable", description: "d", input_schema: { type: "object" } }]);
    expect(out[0]).toEqual({ type: "function", function: { name: "addTable", description: "d", parameters: { type: "object" } } });
  });
});
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/providers/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/ai/providers/
git commit -m "feat(ai): add streaming provider abstraction (Anthropic/OpenAI)"
```

---

### Task 5: History — structured turn reconstruction

**Files:**
- Modify: `apps/api/src/modules/ai/ai-history.service.ts`
- Test: `apps/api/src/modules/ai/ai-history.service.spec.ts` (add a case; create file if absent)

Add `findRecentTurns` that maps the existing `findRecent` rows into `ConvMessage[]`, folding any saved `diff` into the assistant text as an action summary (no tool_use blocks → no dangling-tool_use API errors).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { rowsToConvMessages } from "./ai-history.service";
import type { AiConversation } from "@erdify/db";

const rows = [
  { role: "user", content: "users 테이블 만들어줘", diff: null } as Partial<AiConversation>,
  { role: "assistant", content: "만들었어요", diff: [{ type: "addTable", tableId: "e1", tableName: "users" }] } as unknown as Partial<AiConversation>,
] as AiConversation[];

describe("rowsToConvMessages", () => {
  it("user/assistant 행을 ConvMessage로 변환하고 diff를 요약 텍스트로 붙인다", () => {
    const msgs = rowsToConvMessages(rows);
    expect(msgs[0]).toEqual({ role: "user", content: "users 테이블 만들어줘" });
    expect(msgs[1].role).toBe("assistant");
    expect((msgs[1] as { text: string }).text).toContain("users");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/ai-history.service.spec.ts`
Expected: FAIL (rowsToConvMessages not exported)

- [ ] **Step 3: Implement** — add to `ai-history.service.ts`:

```ts
import type { ConvMessage } from "./providers/provider.types";
import type { DiffChange } from "@erdify/contracts";

export function rowsToConvMessages(rows: AiConversation[]): ConvMessage[] {
  return rows.map((r): ConvMessage => {
    if (r.role === "user") return { role: "user", content: r.content };
    const diff = (r.diff as unknown as DiffChange[] | null) ?? [];
    const summary = diff.length ? `\n[적용한 변경: ${diff.map((d) => ("tableName" in d ? d.tableName : "fromTable" in d ? `${d.fromTable}->${d.toTable}` : "")).filter(Boolean).join(", ")}]` : "";
    return { role: "assistant", text: (r.content ?? "") + summary, toolCalls: [] };
  });
}
```

And add a method on the service:
```ts
async findRecentTurns(userId: string, diagramId: string | null): Promise<ConvMessage[]> {
  const rows = await this.findRecent(userId, diagramId);
  return rowsToConvMessages(rows);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/ai-history.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/ai/ai-history.service.ts apps/api/src/modules/ai/ai-history.service.spec.ts
git commit -m "feat(ai): reconstruct recent history as ConvMessage turns"
```

---

### Task 6: Agent runtime — AiChatService.runChat

**Files:**
- Create: `apps/api/src/modules/ai/chat/ai-chat.service.ts`
- Test: `apps/api/src/modules/ai/chat/ai-chat.service.spec.ts`
- Modify: `apps/api/src/modules/ai/ai.service.ts` (make helpers public — see below)

Make these `ai.service.ts` methods **public** (remove `private`) so AiChatService can reuse them: `getDiagramAndOrgId` (also return `diagramName`), `getOrgApiKeyAndProvider`. Update `getDiagramAndOrgId` to also select `d.name`:

```ts
async getDiagramAndOrgId(diagramId: string): Promise<{ doc: DiagramDocument; orgId: string; diagramName: string }> {
  const diagram = await this.diagramRepo
    .createQueryBuilder("d")
    .innerJoin("projects", "p", "p.id = d.project_id")
    .where("d.id = :diagramId", { diagramId })
    .select(["d.content AS content", "d.name AS name", "p.organization_id AS org_id"])
    .getRawOne<{ content: DiagramDocument; name: string; org_id: string }>();
  if (!diagram) throw new NotFoundException("다이어그램을 찾을 수 없습니다.");
  return { doc: diagram.content, orgId: diagram.org_id, diagramName: diagram.name };
}
```

- [ ] **Step 1: Write the failing test** (mock provider, in-memory repos)

```ts
import { describe, it, expect, vi } from "vitest";
import { AiChatService } from "./ai-chat.service";
import type { AiProvider, ProviderTurn } from "../providers/provider.types";
import type { AiStreamEvent } from "@erdify/contracts";
import { ToolExecutor } from "../tools/tool-executor";
import { DomainLoaderService } from "../../../common/services/domain-loader.service";

const doc = { format: "erdify.schema.v1", id: "d1", name: "shop", dialect: "postgresql", entities: [], relationships: [], indexes: [], views: [], layout: { entityPositions: {} }, metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" } };

function makeService(turns: ProviderTurn[]) {
  let i = 0;
  const provider: AiProvider = { streamTurn: vi.fn(async (a) => { a.onText("…"); return turns[i++]!; }) };
  const aiService = { getDiagramAndOrgId: vi.fn(async () => ({ doc, orgId: "o1", diagramName: "shop" })), getOrgApiKeyAndProvider: vi.fn(async () => ({ apiKey: "k", provider: "anthropic", model: "m" })) };
  const history = { findRecentTurns: vi.fn(async () => []), saveUserMessage: vi.fn(async () => undefined), saveAssistantMessage: vi.fn(async () => ({ id: "msg1" })) };
  const usage = { log: vi.fn(async () => undefined) };
  const sessionRepo = { getMeta: vi.fn(async () => ({ userName: "u", userEmail: "e", orgName: "o" })) };
  const svc = new AiChatService(aiService as any, history as any, new ToolExecutor(new DomainLoaderService()), usage as any, provider, provider, sessionRepo as any);
  return { svc };
}

describe("AiChatService.runChat", () => {
  it("도구 호출이 없으면 1회 turn 후 done을 emit한다", async () => {
    const { svc } = makeService([{ text: "안녕하세요", toolCalls: [] }]);
    const events: AiStreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "hi", enableReadTools: false }, (e) => events.push(e));
    const done = events.find((e) => e.type === "done");
    expect(done).toMatchObject({ type: "done", content: "안녕하세요", diff: null });
    expect(events.some((e) => e.type === "step")).toBe(true);
  });

  it("도구 호출을 실행하고 결과를 다음 turn에 먹인 뒤 종료한다", async () => {
    const { svc } = makeService([
      { text: "", toolCalls: [{ id: "t1", name: "addTable", input: { name: "users" } }] },
      { text: "users 테이블을 추가했어요", toolCalls: [] },
    ]);
    const events: AiStreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "users 테이블", enableReadTools: false }, (e) => events.push(e));
    expect(events.some((e) => e.type === "tool_call")).toBe(true);
    expect(events.some((e) => e.type === "tool_result")).toBe(true);
    const done = events.find((e) => e.type === "done");
    expect((done as { diff: unknown[] }).diff).toHaveLength(1);
    expect((done as { pendingDocument: { entities: unknown[] } }).pendingDocument.entities).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/chat/ai-chat.service.spec.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `ai-chat.service.ts`**

```ts
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, Organization } from "@erdify/db";
import type { DiffChange, AiStreamEvent } from "@erdify/contracts";
import type { DiagramDocument } from "@erdify/domain";
import { AiService } from "../ai.service";
import { AiHistoryService } from "../ai-history.service";
import { ToolExecutor } from "../tools/tool-executor";
import { UsageService } from "../../usage/usage.service";
import { AnthropicProvider } from "../providers/anthropic.provider";
import { OpenAiProvider } from "../providers/openai.provider";
import { buildSystemPrompt } from "../context/context-builder";
import { ERD_TOOLS } from "../erd-tools";
import { READ_TOOLS } from "../tools/read-tools";
import type { ConvMessage, AiProvider, NormalizedToolCall } from "../providers/provider.types";

const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 8;

export interface RunChatParams {
  userId: string;
  diagramId: string;
  message: string;
  enableReadTools: boolean;
  isAborted?: () => boolean;
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly historyService: AiHistoryService,
    private readonly toolExecutor: ToolExecutor,
    private readonly usageService: UsageService,
    private readonly anthropic: AnthropicProvider,
    private readonly openai: OpenAiProvider,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
  ) {}

  async runChat(params: RunChatParams, emit: (e: AiStreamEvent) => void): Promise<void> {
    try {
      const { userId, diagramId, message, enableReadTools } = params;
      const { doc, orgId, diagramName } = await this.aiService.getDiagramAndOrgId(diagramId);
      const { apiKey, provider, model } = await this.aiService.getOrgApiKeyAndProvider(orgId, userId);

      const [user, org] = await Promise.all([
        this.userRepo.findOne({ where: { id: userId } }),
        this.orgRepo.findOne({ where: { id: orgId } }),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      const system = buildSystemPrompt(doc, {
        userName: user?.name ?? "Unknown", userEmail: user?.email ?? "",
        orgName: org?.name ?? "", diagramId, diagramName, today,
      }, enableReadTools);

      const history = await this.historyService.findRecentTurns(userId, diagramId);
      await this.historyService.saveUserMessage(userId, diagramId, message);

      const tools = enableReadTools ? [...ERD_TOOLS, ...READ_TOOLS] : ERD_TOOLS;
      const impl: AiProvider = provider === "openai" ? this.openai : this.anthropic;
      const messages: ConvMessage[] = [...history, { role: "user", content: message }];

      let updatedDoc: DiagramDocument = doc;
      const diffs: DiffChange[] = [];
      const allToolCalls: NormalizedToolCall[] = [];
      let finalText = "";

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        if (params.isAborted?.()) return;
        const turn = await impl.streamTurn({ apiKey, model, system, messages, tools, maxTokens: MAX_TOKENS, onText: (d) => emit({ type: "step", text: d }) });
        finalText = turn.text;
        if (turn.toolCalls.length === 0) break;

        messages.push({ role: "assistant", text: turn.text, toolCalls: turn.toolCalls });
        const results: { toolCallId: string; toolName: string; content: string }[] = [];
        for (const call of turn.toolCalls) {
          allToolCalls.push(call);
          emit({ type: "tool_call", name: call.name, label: toolLabel(call) });
          const res = await this.toolExecutor.execute(call.name, call.input, updatedDoc);
          updatedDoc = res.doc;
          for (const ch of res.changes) { diffs.push(ch); emit({ type: "tool_result", change: ch }); }
          results.push({ toolCallId: call.id, toolName: call.name, content: res.resultText });
        }
        messages.push({ role: "tool", results });
        if (i === MAX_ITERATIONS - 1) this.logger.warn(`AI loop hit MAX_ITERATIONS for diagram ${diagramId}`);
      }

      const hasDiff = diffs.length > 0;
      const content = finalText || (hasDiff ? "ERD를 업데이트했습니다. 아래 변경사항을 확인해주세요." : "");
      const saved = await this.historyService.saveAssistantMessage(
        userId, diagramId, content, hasDiff ? diffs : null,
        allToolCalls.length ? (allToolCalls as unknown as Record<string, unknown>[]) : null,
      );

      this.usageService.log(orgId, userId, "ai_chat", "diagram", diagramId, { provider, model, tool_call_count: allToolCalls.length }).catch((e) => this.logger.error(e));

      emit({ type: "done", messageId: saved.id, content, diff: hasDiff ? diffs : null, pendingDocument: hasDiff ? updatedDoc : null });
    } catch (e) {
      this.logger.error(e);
      emit({ type: "error", message: e instanceof Error ? e.message : "AI 처리 중 오류가 발생했습니다." });
    }
  }
}

function toolLabel(call: NormalizedToolCall): string {
  const name = (call.input["name"] as string) ?? "";
  switch (call.name) {
    case "addTable": return `${name} 테이블 생성 중`;
    case "removeTable": return `테이블 삭제 중`;
    case "updateTable": return `테이블 수정 중`;
    case "addColumn": return `${name} 컬럼 추가 중`;
    case "removeColumn": return `컬럼 삭제 중`;
    case "updateColumn": return `컬럼 수정 중`;
    case "addRelation": return `관계 추가 중`;
    case "removeRelation": return `관계 삭제 중`;
    case "addIndex": return `인덱스 추가 중`;
    case "listTables": return `스키마 조회 중`;
    case "getTableDetails": return `테이블 상세 조회 중`;
    default: return `${call.name} 실행 중`;
  }
}
```

> The test constructs `AiChatService` with positional args; the `@InjectRepository` repos are the last two constructor params — the test passes a `sessionRepo as any` for both via the spread (acceptable: the mock only needs `findOne`). Adjust the test's last two args to `userRepo`/`orgRepo` mocks each returning `findOne: async () => ({ name, email })`. Update the test accordingly when implementing.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @erdify/api exec vitest run src/modules/ai/chat/ai-chat.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/ai/chat/ apps/api/src/modules/ai/ai.service.ts
git commit -m "feat(ai): add agentic streaming chat runtime (AiChatService.runChat)"
```

---

### Task 7: SSE controller + DTO + module wiring + remove old chat

**Files:**
- Create: `apps/api/src/modules/ai/dto/chat-stream.dto.ts`
- Modify: `apps/api/src/modules/ai/ai.controller.ts`
- Modify: `apps/api/src/modules/ai/ai.module.ts`
- Modify: `apps/api/src/modules/ai/ai.service.ts` (remove `chat`, `callAnthropic`, `callOpenAI`, `executeTool`, `buildDiagramContext`)
- Delete: `apps/api/src/modules/ai/dto/chat.dto.ts`

- [ ] **Step 1: Create `chat-stream.dto.ts`**

```ts
import { IsString, MinLength, MaxLength, IsBoolean, IsOptional } from "class-validator";

export class AiChatStreamDto {
  @IsString() @MinLength(1)
  diagramId!: string;

  @IsString() @MinLength(1) @MaxLength(2000)
  message!: string;

  @IsBoolean() @IsOptional()
  enableReadTools?: boolean;
}
```

- [ ] **Step 2: Update `ai.controller.ts`** — remove the `chat()` handler + `AiChatDto` import, inject `AiChatService`, add the SSE endpoint:

```ts
import { Body, Controller, Param, Post, Get, Put, UseGuards, Res } from "@nestjs/common";
import type { Response } from "express";
import { AiChatService } from "./chat/ai-chat.service";
import { AiChatStreamDto } from "./dto/chat-stream.dto";
import type { AiStreamEvent } from "@erdify/contracts";
// ...keep existing imports (drop AiChatDto and AiChatResponse if now unused)

  // constructor: add `private readonly aiChatService: AiChatService,`

  @Post("ai/chat/stream")
  async chatStream(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatStreamDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let aborted = false;
    res.on("close", () => { aborted = true; });
    const write = (e: AiStreamEvent) => {
      res.write(`data: ${JSON.stringify(e)}\n\n`);
      (res as Response & { flush?: () => void }).flush?.();
    };

    await this.aiChatService.runChat(
      { userId: user.sub, diagramId: dto.diagramId, message: dto.message, enableReadTools: dto.enableReadTools ?? false, isAborted: () => aborted },
      write,
    );
    res.end();
  }
```

- [ ] **Step 3: Update `ai.module.ts`**

```ts
import { OrganizationAiSettings, AiConversation, Diagram, OrganizationMember, User, Organization } from "@erdify/db";
import { AiChatService } from "./chat/ai-chat.service";
import { ToolExecutor } from "./tools/tool-executor";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { OpenAiProvider } from "./providers/openai.provider";

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationAiSettings, AiConversation, Diagram, OrganizationMember, User, Organization]),
    AuthModule, CommonModule, UsageModule,
  ],
  controllers: [AiController],
  providers: [AiService, AiHistoryService, AiChatService, ToolExecutor, AnthropicProvider, OpenAiProvider],
})
export class AiModule {}
```

> Verify `User` and `Organization` are exported from `@erdify/db` (they are entities under `packages/db/src/entities/`; confirm in `packages/db/src/entities/index.ts`). If a different export name is used, match it.

- [ ] **Step 4: Trim `ai.service.ts`** — delete `chat()`, `callAnthropic()`, `callOpenAI()`, `executeTool()`, and the `buildDiagramContext` function. Keep `getOrgAiSettings`, `updateOrgAiSettings`, `suggestColumns`, `requireOrgMember`, `requireOrgOwner`, and the now-public `getDiagramAndOrgId` / `getOrgApiKeyAndProvider`. Remove now-unused imports (`ERD_TOOLS`, `ERD_TOOLS_OPENAI`, `randomUUID` if unused, `DiagramColumn`/`DiagramIndex`/`DiagramRelationship`/`RelationshipCardinality` if unused, `AiChatResponse`, `DiffChange` if unused). `suggestColumns` still uses Anthropic/OpenAI directly — keep those imports.

- [ ] **Step 5: Delete the dead DTO**

```bash
git rm apps/api/src/modules/ai/dto/chat.dto.ts
```

- [ ] **Step 6: Typecheck the API**

Run: `pnpm --filter @erdify/api typecheck`
Expected: PASS (no type errors)

- [ ] **Step 7: Run the full API test suite**

Run: `pnpm --filter @erdify/api test`
Expected: PASS (delete or update any stale `ai.service.spec.ts` cases that referenced the removed `chat()`/`executeTool` — move executor assertions to `tool-executor.spec.ts`)

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/ai/
git commit -m "feat(ai): replace POST /ai/chat with SSE streaming endpoint"
```

---

## Frontend

### Task 8: API client — streamAiChat

**Files:**
- Modify: `apps/web/src/features/ai/api/ai.api.ts`
- Modify: `apps/web/src/features/ai/api/ai.api.test.ts` (remove `sendAiChat` test; keep accept/reject/suggest)

- [ ] **Step 1: Replace `sendAiChat` with `streamAiChat`** in `ai.api.ts`

```ts
import { httpClient, API_BASE_URL } from "@/shared/api/httpClient";
import type { AiStreamEvent, ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";

export const streamAiChat = async (
  diagramId: string,
  message: string,
  enableReadTools: boolean,
  onEvent: (event: AiStreamEvent) => void,
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diagramId, message, enableReadTools }),
  });
  if (!res.ok || !res.body) throw new Error(`AI stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.replace(/^data: ?/, "").trim();
      if (!line) continue;
      onEvent(JSON.parse(line) as AiStreamEvent);
    }
  }
};
```

Keep `acceptAiDiff`, `rejectAiDiff`, `suggestColumns`, `getOrgAiSettings`, `updateOrgAiSettings` unchanged.

- [ ] **Step 2: Update `ai.api.test.ts`** — delete the "sendAiChat" test case (lines ~16-33). Add a `streamAiChat` test that mocks `fetch` with a `ReadableStream`:

```ts
import { streamAiChat } from "./ai.api";
import type { AiStreamEvent } from "@erdify/contracts";

it("streamAiChat은 SSE data 라인을 파싱해 onEvent로 전달한다", async () => {
  const chunks = [
    'data: {"type":"step","text":"안녕"}\n\n',
    'data: {"type":"done","messageId":"m1","content":"끝","diff":null,"pendingDocument":null}\n\n',
  ];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  global.fetch = vi.fn(async () => new Response(stream, { status: 200 })) as unknown as typeof fetch;

  const events: AiStreamEvent[] = [];
  await streamAiChat("d1", "hi", false, (e) => events.push(e));
  expect(events.map((e) => e.type)).toEqual(["step", "done"]);
});
```

(Ensure `vi` is imported in the test file.)

- [ ] **Step 3: Run web tests**

Run: `pnpm --filter @erdify/web exec vitest run src/features/ai/api/ai.api.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/ai/api/
git commit -m "feat(web): add streamAiChat SSE client, remove sendAiChat"
```

---

### Task 9: Store — streaming state + read-tools toggle

**Files:**
- Modify: `apps/web/src/features/ai/store/aiChatSlice.ts`

- [ ] **Step 1: Extend the slice** — add streaming state, the toggle, and stream lifecycle actions. Replace the slice interface/impl additions:

```ts
// add to AiChatSlice interface:
  enableReadTools: boolean;
  streamingStatus: string | null;   // current step label, e.g. "orders 테이블 생성 중"
  streamingText: string;            // accumulated assistant text
  setEnableReadTools: (v: boolean) => void;
  startAssistantStream: () => void;
  appendStreamText: (delta: string) => void;
  setStreamStatus: (label: string) => void;
  finishAssistantStream: (msg: { messageId: string; content: string; diff: DiffChange[] | null; pendingDocument: DiagramDocument | null }) => void;
  failAssistantStream: (message: string) => void;
```

```ts
// add to createAiChatSlice initial state:
  enableReadTools: false,
  streamingStatus: null,
  streamingText: "",

// actions:
  setEnableReadTools: (v) => set({ enableReadTools: v }),
  startAssistantStream: () => set({ isLoading: true, streamingStatus: null, streamingText: "" }),
  appendStreamText: (delta) => set((s) => ({ streamingText: s.streamingText + delta })),
  setStreamStatus: (label) => set({ streamingStatus: label }),
  finishAssistantStream: (msg) =>
    set((s) => ({
      isLoading: false, streamingStatus: null, streamingText: "",
      messages: [...s.messages, { id: msg.messageId, role: "assistant", content: msg.content, diff: msg.diff, pendingDocument: msg.pendingDocument, accepted: null }],
    })),
  failAssistantStream: (message) =>
    set((s) => ({
      isLoading: false, streamingStatus: null, streamingText: "",
      messages: [...s.messages, { id: randomUUID(), role: "assistant", content: message, diff: null, pendingDocument: null, accepted: null }],
    })),
```

Remove `addAssistantMessage` (replaced by the stream lifecycle) — or keep it if other callers exist (grep `addAssistantMessage`; only `FloatingAIChat` uses it, so remove).

- [ ] **Step 2: Typecheck web**

Run: `pnpm --filter @erdify/web typecheck`
Expected: will still fail until Task 10 updates `FloatingAIChat`; that's expected. Proceed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/ai/store/aiChatSlice.ts
git commit -m "feat(web): add streaming state and read-tools toggle to AI chat store"
```

---

### Task 10: FloatingAIChat — consume stream, toggle UI, step display

**Files:**
- Modify: `apps/web/src/features/ai/components/FloatingAIChat.tsx`
- Modify: `apps/web/src/features/ai/components/FloatingAIChat.css.ts` (add toggle + status styles)

- [ ] **Step 1: Rewrite `handleSend` to consume the stream**

```tsx
const {
  isOpen, messages, isLoading, enableReadTools, streamingStatus, streamingText,
  reviewingMessageId, openReview, closeReview, openChat, closeChat,
  addUserMessage, acceptDiff, rejectDiff,
  setEnableReadTools, startAssistantStream, appendStreamText, setStreamStatus, finishAssistantStream, failAssistantStream,
} = useAIChatStore();

const handleSend = async (message: string) => {
  addUserMessage(message);
  startAssistantStream();
  try {
    await streamAiChat(diagramId, message, enableReadTools, (event) => {
      if (event.type === "step") appendStreamText(event.text);
      else if (event.type === "tool_call") setStreamStatus(event.label);
      else if (event.type === "done") finishAssistantStream(event);
      else if (event.type === "error") failAssistantStream(event.content ?? "오류가 발생했습니다.");
    });
  } catch {
    failAssistantStream("오류가 발생했습니다. 다시 시도해주세요.");
  }
};
```

> `error` event field is `message`, not `content` — use `event.message`. Fix when implementing: `failAssistantStream(event.message)`.

- [ ] **Step 2: Replace the "AI가 생각 중..." block** with live status + streaming text:

```tsx
{isLoading && (
  <div className={s.chatThinking}>
    <div className={s.thinkingDots}><div className={s.thinkingDot} /><div className={s.thinkingDot} /><div className={s.thinkingDot} /></div>
    {streamingStatus ?? "AI가 생각 중..."}
    {streamingText && <div className={s.streamingText}>{streamingText}</div>}
  </div>
)}
```

- [ ] **Step 3: Add the read-tools toggle + notice** above the textarea in `chatInputArea`:

```tsx
<label className={s.deepToggle}>
  <input type="checkbox" checked={enableReadTools} onChange={(e) => setEnableReadTools(e.target.checked)} />
  심층 탐색 모드
</label>
{enableReadTools && (
  <div className={s.deepNotice}>AI가 스키마를 단계적으로 탐색해 더 정확하게 작업합니다. 응답이 다소 느려질 수 있어요.</div>
)}
```

- [ ] **Step 4: Add the new styles** to `FloatingAIChat.css.ts`:

```ts
export const streamingText = style({ marginTop: 6, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" });
export const deepToggle = style({ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", marginBottom: 4, cursor: "pointer" });
export const deepNotice = style({ fontSize: 11, color: "#9ca3af", marginBottom: 6, lineHeight: 1.4 });
```

> Confirm the file uses `@vanilla-extract/css` `style` (it's imported as `* as s` from a `.css.ts`). Match the existing export style.

- [ ] **Step 5: Typecheck + build web**

Run: `pnpm --filter @erdify/web typecheck`
Expected: PASS

- [ ] **Step 6: Run web tests**

Run: `pnpm --filter @erdify/web test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/ai/components/
git commit -m "feat(web): stream AI chat with step-by-step display and deep-explore toggle"
```

---

### Task 11: Full verification

- [ ] **Step 1: Typecheck everything**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Lint changed packages**

Run: `pnpm --filter @erdify/api lint && pnpm --filter @erdify/web lint`
Expected: PASS

- [ ] **Step 3: Full test run**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Manual smoke (optional, needs running stack + org API key)** — `pnpm dev`, open a diagram, send "users 테이블 만들어줘", confirm step labels stream and the diff review panel appears; toggle 심층 탐색 모드 and confirm the notice shows and `getTableDetails` runs on a large diagram.

---

## Self-Review

**Spec coverage:**
- §1 Architecture (module restructure) → Tasks 2,3,4,6,7 ✓
- §2 Agent runtime + read tools toggle → Tasks 3,6 ✓
- §3 Context builder (full diagram + comment/index + session meta, drop substring) → Task 2 ✓
- §4 History reconstruction → Task 5 (decision refined: text+summary, not tool_use replay — spec §4 updated) ✓
- §5 SSE endpoint, remove POST /ai/chat → Task 7 (data-only lines; documented) ✓
- §6 Provider abstraction streaming → Task 4 ✓
- §7 Frontend stream + toggle + notice → Tasks 8,9,10 ✓
- §8 Remove old chat / keep suggestColumns → Task 7 ✓
- §9 Tests → each task has tests ✓
- §10 No DB migration → confirmed (reuse jsonb) ✓

**Placeholder scan:** Task 3 Step 4 intentionally references "PORT VERBATIM from ai.service.ts:313-466" — this is a precise instruction to move existing, already-correct code, not a placeholder. All other code blocks are complete.

**Type consistency:** `AiStreamEvent` (contracts) used in controller/client/store. `ConvMessage`/`ProviderTurn`/`NormalizedToolCall` (provider.types) used in providers/runtime/history. `error` event uses `message` field — flagged inline in Task 10 Step 1 to use `event.message`. `ToolResult.resultText` produced by ToolExecutor, consumed by runtime as tool result content. `getDiagramAndOrgId` return shape extended with `diagramName` consistently in Task 6.

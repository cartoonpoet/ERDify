# SQL 객체 MCP·CLI 지원 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 머지된 도메인 `objects`(프로시저·함수·트리거·뷰)를 MCP·CLI의 조회/DDL 출력에 반영하고, MCP·CLI에서 객체 CRUD를 할 수 있게 한다.

**Architecture:** 도메인 타입·커맨드(`addObject/updateObject/removeObject`)는 origin/master에 이미 존재. 이 계획은 (1) 공유 유틸 `format-diagram`·`ddl-generator`·`validate-diagram`을 objects 인지하도록 확장(한 곳 고치면 CLI·MCP·web 동시 반영)하고, (2) MCP·CLI에 얇은 위임 명령을 추가한다. web/api는 손대지 않는다.

**Tech Stack:** TypeScript(ESM, `.js` import 확장자), vitest(globals), commander(CLI), `@modelcontextprotocol/sdk` + zod(MCP), turbo 모노레포.

## Global Constraints

- import 경로는 항상 `.js` 확장자 사용 (ESM). 타입은 `import type`.
- vitest는 globals 모드 — `describe/it/expect`는 import 없이 사용.
- `objects`는 optional(`DiagramObject[] | undefined`) → 모든 소비 지점에서 `doc.objects ?? []` 가드.
- `views: []` placeholder는 유지. web/api 파일은 수정 금지.
- 커밋 메시지 말미에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- `DiagramObject` 형태(재정의 금지, 이미 존재): `{ id: string; kind: "procedure"|"function"|"trigger"|"view"; name: string; sql: string }`. 타입명 `DiagramObject`, `DiagramObjectKind`은 `@erdify/domain`에서 export됨.
- 도메인 커맨드 시그니처(이미 존재):
  - `addObject(doc, object: DiagramObject): DiagramDocument`
  - `updateObject(doc, objectId: string, changes: Partial<Omit<DiagramObject,"id">>): DiagramDocument`
  - `removeObject(doc, objectId: string): DiagramDocument`

---

## File Structure

- `packages/domain/src/types/diagram.type.ts` — `DdlWarningCode`에 `"object_raw_sql"` 추가 (Task 1)
- `packages/domain/src/utils/ddl-generator.ts` — objects DDL append + 경고 (Task 1)
- `packages/domain/src/utils/ddl-generator.test.ts` — 테스트 (Task 1)
- `packages/domain/src/utils/format-diagram.ts` — Objects 요약 섹션 (Task 2)
- `packages/domain/src/utils/format-diagram.test.ts` — 테스트 (Task 2)
- `packages/domain/src/validation/validate-diagram.ts` — objects 검증 (Task 3)
- `packages/domain/src/validation/validate-diagram.test.ts` — 테스트 (Task 3)
- `apps/mcp-server/src/tools/write-tools.ts` — `add_object/update_object/remove_object` (Task 4)
- `apps/mcp-server/package.json` + `apps/mcp-server/src/index.ts` — 버전 0.3.0 (Task 4)
- `apps/cli/src/index.ts` — `add/update/remove object` + `.version` 정합 (Task 5)
- `apps/cli/package.json` — 버전 0.1.9 (Task 5)

---

### Task 1: DDL export에 객체 SQL 포함 + 경고

**Files:**
- Modify: `packages/domain/src/types/diagram.type.ts:106-116` (`DdlWarningCode`)
- Modify: `packages/domain/src/utils/ddl-generator.ts` (import 1-9줄, `generateDdlReport` 391줄)
- Test: `packages/domain/src/utils/ddl-generator.test.ts`

**Interfaces:**
- Consumes: `DiagramObject`(이미 존재), `DdlWarning { code, message, entity?, column?, relationship? }`, `generateDdlReport(doc): { sql, warnings }`.
- Produces: `generateDdlReport`가 `doc.objects`의 각 객체를 `-- Objects` 배너 + `-- <kind>: <name>` 헤더 + `sql` 원문으로 DDL 끝에 append하고, 객체당 `{ code: "object_raw_sql", entity: <name> }` 경고를 남긴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/domain/src/utils/ddl-generator.test.ts` 파일 끝에 append. 파일 상단은 이미
`createEmptyDiagram`, `addEntity`, `generateDdlReport`를 import한다. `addObject`가 상단
import에 없으면 상단 import 블록에 `import { addObject } from "../commands/object-commands.js";`
한 줄 추가. `DiagramObject` 타입도 `import type { DiagramColumn, DiagramRelationship } from "../types/index.js";` 줄에 `DiagramObject`를 추가한다.

```ts
describe("generateDdlReport — objects", () => {
  const withObject = (overrides: Partial<DiagramObject> = {}) => {
    const base = addEntity(
      createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" }),
      { id: "e1", name: "users" }
    );
    return addObject(base, {
      id: "o1",
      kind: "procedure",
      name: "sp_active_users",
      sql: "CREATE PROCEDURE sp_active_users() AS $$ SELECT 1 $$;",
      ...overrides,
    });
  };

  it("appends object sql under an -- Objects section with a kind header", () => {
    const { sql } = generateDdlReport(withObject());
    expect(sql).toContain("-- Objects");
    expect(sql).toContain("-- procedure: sp_active_users");
    expect(sql).toContain("CREATE PROCEDURE sp_active_users() AS $$ SELECT 1 $$;");
  });

  it("emits an object_raw_sql warning per object", () => {
    const { warnings } = generateDdlReport(withObject());
    const raw = warnings.filter((w) => w.code === "object_raw_sql");
    expect(raw).toHaveLength(1);
    expect(raw[0].entity).toBe("sp_active_users");
  });

  it("does not add an Objects section when there are no objects", () => {
    const doc = addEntity(
      createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" }),
      { id: "e1", name: "users" }
    );
    const { sql, warnings } = generateDdlReport(doc);
    expect(sql).not.toContain("-- Objects");
    expect(warnings.some((w) => w.code === "object_raw_sql")).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd packages/domain && npx vitest run src/utils/ddl-generator.test.ts`
Expected: FAIL — "-- Objects" 미포함 / `object_raw_sql`가 `DdlWarningCode`에 없어 타입에러 또는 assertion 실패.

- [ ] **Step 3: `DdlWarningCode`에 코드 추가**

`packages/domain/src/types/diagram.type.ts` 116줄 `| "sensitive_info";`를 아래로 교체:

```ts
  | "sensitive_info"
  | "object_raw_sql";
```

- [ ] **Step 4: `ddl-generator.ts` import에 타입 추가**

1-9줄 import 블록의 타입 목록에 `DiagramObject`를 추가 (알파벳 순 위치, `DiagramIndex` 다음):

```ts
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
```

- [ ] **Step 5: objects 렌더 헬퍼 추가 + `generateDdlReport`에서 호출**

`ddl-generator.ts`에서 `export function generateDdlReport` 정의 **바로 위**에 헬퍼를 추가:

```ts
/**
 * 객체(프로시저·함수·트리거·뷰)의 SQL 원문을 DDL 끝에 append한다.
 * sql은 사용자 원문 텍스트라 dialect 검증 대상이 아니므로 객체당 object_raw_sql 경고를 남긴다.
 */
function objectsDdl(objects: DiagramObject[], warnings: DdlWarning[]): string {
  if (objects.length === 0) return "";
  const blocks: string[] = ["-- Objects"];
  for (const obj of objects) {
    blocks.push(`-- ${obj.kind}: ${obj.name}\n${obj.sql.trim()}`);
    warnings.push({
      code: "object_raw_sql",
      message: `객체 "${obj.name}"(${obj.kind})의 SQL은 원문 텍스트로 내보내지며 dialect 검증 대상이 아닙니다.`,
      entity: obj.name,
    });
  }
  return blocks.join("\n\n");
}
```

그리고 `generateDdlReport` 내부에서, `if (fkParts.length > 0) parts.push(...)` 다음 줄과
`return { sql: parts.join("\n\n"), warnings };` 사이에 아래를 삽입:

```ts
  const objectsSql = objectsDdl(doc.objects ?? [], warnings);
  if (objectsSql) parts.push(objectsSql);
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd packages/domain && npx vitest run src/utils/ddl-generator.test.ts`
Expected: PASS (신규 describe 3개 + 기존 케이스 모두).

- [ ] **Step 7: 커밋**

```bash
git add packages/domain/src/types/diagram.type.ts packages/domain/src/utils/ddl-generator.ts packages/domain/src/utils/ddl-generator.test.ts
git commit -m "feat(domain): DDL export에 객체 SQL 포함 + object_raw_sql 경고 (#28)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 다이어그램 요약에 Objects 섹션

**Files:**
- Modify: `packages/domain/src/utils/format-diagram.ts:32` (return 직전)
- Test: `packages/domain/src/utils/format-diagram.test.ts`

**Interfaces:**
- Consumes: `formatDiagram(name, doc): string`, `doc.objects`.
- Produces: objects가 있으면 요약 끝에 `Objects (N):` 섹션과 `  <kind> <name> [objectId: <id>]` 줄들을 붙인다. objects가 없으면 섹션 미출력.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/domain/src/utils/format-diagram.test.ts` 끝에 append. 상단 import에 `addObject`가
없으면 `import { addObject } from "../commands/object-commands.js";` 추가.

```ts
describe("formatDiagram — objects", () => {
  it("lists objects with kind, name, and objectId", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addObject(doc, {
      id: "o1",
      kind: "view",
      name: "v_active",
      sql: "CREATE VIEW v_active AS SELECT 1;",
    });
    const out = formatDiagram("T", doc);
    expect(out).toContain("Objects (1):");
    expect(out).toContain("view v_active [objectId: o1]");
  });

  it("omits the Objects section when there are none", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    expect(formatDiagram("T", doc)).not.toContain("Objects (");
  });
});
```

`format-diagram.test.ts` 상단이 `createEmptyDiagram`/`formatDiagram`을 import하는지 확인하고
없으면 추가:
`import { createEmptyDiagram } from "../schema/create-empty-diagram.js";`
`import { formatDiagram } from "./format-diagram.js";`

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd packages/domain && npx vitest run src/utils/format-diagram.test.ts`
Expected: FAIL — "Objects (1):" 미포함.

- [ ] **Step 3: `format-diagram.ts`에 섹션 추가**

32줄 `return lines.join("\n");` **바로 위**에 삽입:

```ts
  const objects = doc.objects ?? [];
  if (objects.length > 0) {
    lines.push("", `Objects (${objects.length}):`);
    for (const obj of objects) {
      lines.push(`  ${obj.kind} ${obj.name} [objectId: ${obj.id}]`);
    }
  }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd packages/domain && npx vitest run src/utils/format-diagram.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add packages/domain/src/utils/format-diagram.ts packages/domain/src/utils/format-diagram.test.ts
git commit -m "feat(domain): 다이어그램 요약에 Objects 섹션 추가 (#28)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: objects 검증 (빈 sql / 이름 중복)

**Files:**
- Modify: `packages/domain/src/validation/validate-diagram.ts`
- Test: `packages/domain/src/validation/validate-diagram.test.ts`

**Interfaces:**
- Consumes: `validateDiagram(doc): { valid, errors }`, `doc.objects`.
- Produces: 객체 `sql`이 공백뿐이면 error, 같은 이름의 객체가 2개 이상이면 error. objects 없거나 정상이면 valid.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/domain/src/validation/validate-diagram.test.ts` 끝에 append. 상단 import에
`addObject`가 없으면 `import { addObject } from "../commands/object-commands.js";` 추가.

```ts
describe("validateDiagram — objects", () => {
  const base = () => createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });

  it("flags an object with empty sql", () => {
    const doc = addObject(base(), { id: "o1", kind: "function", name: "f1", sql: "   " });
    const result = validateDiagram(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("f1"))).toBe(true);
  });

  it("flags duplicate object names", () => {
    let doc = addObject(base(), { id: "o1", kind: "view", name: "dup", sql: "CREATE VIEW dup AS SELECT 1;" });
    doc = addObject(doc, { id: "o2", kind: "procedure", name: "dup", sql: "CREATE PROCEDURE dup() AS $$ $$;" });
    const result = validateDiagram(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("dup"))).toBe(true);
  });

  it("accepts well-formed objects", () => {
    const doc = addObject(base(), { id: "o1", kind: "view", name: "ok", sql: "CREATE VIEW ok AS SELECT 1;" });
    expect(validateDiagram(doc).valid).toBe(true);
  });
});
```

상단이 `createEmptyDiagram`/`validateDiagram`을 import하는지 확인하고 없으면 추가:
`import { createEmptyDiagram } from "../schema/create-empty-diagram.js";`
`import { validateDiagram } from "./validate-diagram.js";`

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd packages/domain && npx vitest run src/validation/validate-diagram.test.ts`
Expected: FAIL — 빈 sql/중복이 error로 잡히지 않음.

- [ ] **Step 3: `validate-diagram.ts`에 검증 추가**

`return { valid: errors.length === 0, errors };` **바로 위**에 삽입:

```ts
  const objects = diagram.objects ?? [];
  const seenNames = new Set<string>();
  for (const obj of objects) {
    if (obj.sql.trim().length === 0) {
      errors.push(`Object "${obj.name}" (${obj.kind}) has empty SQL.`);
    }
    if (seenNames.has(obj.name)) {
      errors.push(`Duplicate object name "${obj.name}".`);
    }
    seenNames.add(obj.name);
  }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd packages/domain && npx vitest run src/validation/validate-diagram.test.ts`
Expected: PASS.

- [ ] **Step 5: 도메인 전체 테스트 + 빌드**

Run: `cd packages/domain && npx vitest run && npm run build`
Expected: 전체 PASS, 빌드 성공.

- [ ] **Step 6: 커밋**

```bash
git add packages/domain/src/validation/validate-diagram.ts packages/domain/src/validation/validate-diagram.test.ts
git commit -m "feat(domain): objects 빈 sql·이름 중복 검증 (#28)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: MCP add_object / update_object / remove_object + 버전 0.3.0

**Files:**
- Modify: `apps/mcp-server/src/tools/write-tools.ts` (import 4-24줄, 스키마 36줄 근처, 도구 등록 75-381줄 내부)
- Modify: `apps/mcp-server/package.json:6` (`0.2.9` → `0.3.0`)
- Modify: `apps/mcp-server/src/index.ts:9` (`version: "0.2.9"` → `"0.3.0"`)

**Interfaces:**
- Consumes: `addObject/updateObject/removeObject`(도메인), `client.getDiagram/updateDiagram/recordToolCall`, `randomUUID`.
- Produces: MCP 도구 `add_object`(→ objectId 반환), `update_object`, `remove_object`.

- [ ] **Step 1: 도메인 커맨드 import 추가**

`write-tools.ts` 4-13줄 `@erdify/domain` import 블록에 3개 추가:

```ts
import {
  addEntity,
  removeEntity,
  addColumn,
  addColumns,
  updateColumn,
  removeColumn,
  addRelationship,
  removeRelationship,
  updateRelationship,
  addObject,
  updateObject,
  removeObject,
} from "@erdify/domain";
```

- [ ] **Step 2: objectInputSchema 추가**

`columnInputSchema` 정의(36줄) **위**에 삽입:

```ts
const objectKindSchema = z.enum(["procedure", "function", "trigger", "view"]);

const objectInputSchema = {
  kind: objectKindSchema.describe("Object kind: procedure | function | trigger | view"),
  name: z.string().describe("Object name"),
  sql: z.string().describe("CREATE ... statement, stored verbatim as raw text (not parsed/validated)"),
};
```

- [ ] **Step 3: 세 도구 등록**

`registerWriteTools`(75줄) 함수 본문 안, 마지막 `server.tool(...)` 등록 뒤이자 닫는 `};`(381줄) **직전**에 삽입:

```ts
  server.tool(
    "add_object",
    "Add a SQL object (procedure/function/trigger/view) to a diagram. Stores the CREATE statement as raw text. Returns the new object's ID.",
    {
      diagramId: z.string(),
      ...objectInputSchema,
    },
    async ({ diagramId, kind, name, sql }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const objectId = randomUUID();
      const updated = addObject(doc, { id: objectId, kind, name, sql });
      await client.updateDiagram(diagramId, updated);
      void client.recordToolCall(diagramId, "add_object", `"${name}" ${kind} 추가`).catch(() => {});
      return { content: [{ type: "text", text: `Object "${name}" (${kind}) added. objectId=${objectId}` }] };
    }
  );

  server.tool(
    "update_object",
    "Update a SQL object's kind, name, or sql by its ID. Only provided fields change.",
    {
      diagramId: z.string(),
      objectId: z.string().describe("ID of the object to update (from get_diagram)"),
      kind: objectKindSchema.optional(),
      name: z.string().optional(),
      sql: z.string().optional().describe("Replacement CREATE statement (raw text)"),
    },
    async ({ diagramId, objectId, kind, name, sql }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const target = (doc.objects ?? []).find((o) => o.id === objectId);
      if (!target) {
        throw new Error(`Object ID "${objectId}" not found in diagram`);
      }
      const changes: { kind?: typeof kind; name?: string; sql?: string } = {};
      if (kind !== undefined) changes.kind = kind;
      if (name !== undefined) changes.name = name;
      if (sql !== undefined) changes.sql = sql;
      const updated = updateObject(doc, objectId, changes);
      await client.updateDiagram(diagramId, updated);
      void client.recordToolCall(diagramId, "update_object", `"${target.name}" 객체 수정`).catch(() => {});
      return { content: [{ type: "text", text: `Object "${target.name}" (${objectId}) updated.` }] };
    }
  );

  server.tool(
    "remove_object",
    "Remove a SQL object from a diagram by its ID",
    {
      diagramId: z.string(),
      objectId: z.string().describe("ID of the object to remove (from get_diagram)"),
    },
    async ({ diagramId, objectId }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const target = (doc.objects ?? []).find((o) => o.id === objectId);
      if (!target) {
        throw new Error(`Object ID "${objectId}" not found in diagram`);
      }
      const updated = removeObject(doc, objectId);
      await client.updateDiagram(diagramId, updated);
      void client.recordToolCall(diagramId, "remove_object", `"${target.name}" 객체 삭제`).catch(() => {});
      return { content: [{ type: "text", text: `Object "${target.name}" (${objectId}) removed.` }] };
    }
  );
```

- [ ] **Step 4: 버전 두 곳 상향**

`apps/mcp-server/package.json` 6줄 `"version": "0.2.9"` → `"version": "0.3.0"`.
`apps/mcp-server/src/index.ts` 9줄 `version: "0.2.9",` → `version: "0.3.0",`.

- [ ] **Step 5: 타입체크 + 빌드**

Run: `cd apps/mcp-server && npm run build`
Expected: 성공. (`get_diagram`/`get_ddl`은 공유 유틸을 쓰므로 Task 1·2 반영이 자동으로 나타난다.)

- [ ] **Step 6: 스모크 — 도구 등록 확인**

Run: `cd apps/mcp-server && node -e "import('./dist/tools/write-tools.js').then(m=>console.log(typeof m.registerWriteTools))"`
Expected: `function` 출력 (import·빌드 정상).

- [ ] **Step 7: 커밋**

```bash
git add apps/mcp-server/src/tools/write-tools.ts apps/mcp-server/package.json apps/mcp-server/src/index.ts
git commit -m "feat(mcp): add_object/update_object/remove_object 도구 + v0.3.0 (#28)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: CLI add/update/remove object + 버전 정합 0.1.9

**Files:**
- Modify: `apps/cli/src/index.ts` (import 1-24줄, `.version` 83줄, `add`/`update`/`remove` 그룹)
- Modify: `apps/cli/package.json:6` (`0.1.8` → `0.1.9`)

**Interfaces:**
- Consumes: `addObject/updateObject/removeObject`, `DiagramObjectKind`, `randomUUID`, `client`.
- Produces: CLI 명령 `add object <diagramId>`, `update object <diagramId> <objectId>`, `remove object <diagramId> <objectId>`. `get diagram/ddl/setup`는 공유 유틸로 자동 반영.

- [ ] **Step 1: import 추가**

`apps/cli/src/index.ts` 1줄 아래 `node:fs` import 추가:

```ts
import { readFileSync } from "node:fs";
```

4-17줄 `@erdify/domain` 값 import 블록에 3개 추가(알파벳 위치 무관, 블록 안 아무 곳):

```ts
  addObject,
  updateObject,
  removeObject,
```

18-24줄 `import type { ... }` 블록에 `DiagramObjectKind` 추가.

- [ ] **Step 2: kind 파싱 헬퍼 추가**

`assertColumnsExist` 헬퍼(56-63줄) **아래**에 삽입:

```ts
const OBJECT_KINDS = ["procedure", "function", "trigger", "view"] as const;

function parseObjectKind(value: string): DiagramObjectKind {
  if (!(OBJECT_KINDS as readonly string[]).includes(value)) {
    console.error(`--kind must be one of: ${OBJECT_KINDS.join(", ")}`);
    process.exit(1);
  }
  return value as DiagramObjectKind;
}

// --sql 또는 --sql-file 중 하나에서 SQL 원문을 읽는다. 둘 다 없으면 종료.
function resolveSql(opts: { sql?: string; sqlFile?: string }): string {
  if (opts.sql !== undefined) return opts.sql;
  if (opts.sqlFile !== undefined) return readFileSync(opts.sqlFile, "utf8");
  console.error("Provide --sql <text> or --sql-file <path>");
  process.exit(1);
}
```

- [ ] **Step 3: `add object` 명령 추가**

`add` 그룹의 `add.command("rel ...")` 액션이 끝나는 지점(261줄 `add` 다음 rel 블록) 뒤,
`const update = ...`(329줄) **앞**에 삽입:

```ts
add
  .command("object <diagramId>")
  .description("Add a SQL object (procedure/function/trigger/view)")
  .requiredOption("--kind <kind>", "procedure | function | trigger | view")
  .requiredOption("--name <name>", "Object name")
  .option("--sql <sql>", "CREATE statement (raw text)")
  .option("--sql-file <path>", "Read the CREATE statement from a file")
  .action(
    async (
      diagramId: string,
      opts: { kind: string; name: string; sql?: string; sqlFile?: string }
    ) => {
      const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
      const kind = parseObjectKind(opts.kind);
      const sql = resolveSql(opts);
      const id = randomUUID();
      const updated = addObject(doc, { id, kind, name: opts.name, sql });
      await client.updateDiagram(diagramId, updated).catch(handleError);
      console.log(`Object "${opts.name}" (${kind}) added. objectId=${id}`);
    }
  );
```

- [ ] **Step 4: `update object` 명령 추가**

`update` 그룹 안, `update.command("rel ...")` 블록 **뒤**(460줄 `const remove = ...` 앞)에 삽입:

```ts
update
  .command("object <diagramId> <objectId>")
  .description("Update a SQL object's kind, name, or sql")
  .option("--kind <kind>", "procedure | function | trigger | view")
  .option("--name <name>", "New object name")
  .option("--sql <sql>", "Replacement CREATE statement (raw text)")
  .option("--sql-file <path>", "Read the replacement statement from a file")
  .action(
    async (
      diagramId: string,
      objectId: string,
      opts: { kind?: string; name?: string; sql?: string; sqlFile?: string }
    ) => {
      const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
      const target = (doc.objects ?? []).find((o) => o.id === objectId);
      if (!target) {
        console.error(`Object ID "${objectId}" not found`);
        process.exit(1);
      }
      const changes: { kind?: DiagramObjectKind; name?: string; sql?: string } = {};
      if (opts.kind !== undefined) changes.kind = parseObjectKind(opts.kind);
      if (opts.name !== undefined) changes.name = opts.name;
      if (opts.sql !== undefined) changes.sql = opts.sql;
      else if (opts.sqlFile !== undefined) changes.sql = readFileSync(opts.sqlFile, "utf8");
      const updated = updateObject(doc, objectId, changes);
      await client.updateDiagram(diagramId, updated).catch(handleError);
      console.log(`Object "${target.name}" (${objectId}) updated.`);
    }
  );
```

- [ ] **Step 5: `remove object` 명령 추가**

`remove` 그룹 안, `remove.command("rel ...")` 블록 **뒤**(504줄 `program.parseAsync` 앞)에 삽입:

```ts
remove
  .command("object <diagramId> <objectId>")
  .description("Remove a SQL object by its ID")
  .action(async (diagramId: string, objectId: string) => {
    const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
    const target = (doc.objects ?? []).find((o) => o.id === objectId);
    if (!target) {
      console.error(`Object ID "${objectId}" not found`);
      process.exit(1);
    }
    const updated = removeObject(doc, objectId);
    await client.updateDiagram(diagramId, updated).catch(handleError);
    console.log(`Object "${target.name}" (${objectId}) removed.`);
  });
```

- [ ] **Step 6: 버전 정합**

`apps/cli/src/index.ts` 83줄 `.version("0.0.0")` → `.version("0.1.9")`.
`apps/cli/package.json` 6줄 `"version": "0.1.8"` → `"version": "0.1.9"`.

- [ ] **Step 7: 타입체크 + 빌드**

Run: `cd apps/cli && npm run build`
Expected: 성공.

- [ ] **Step 8: 스모크 — 명령·버전 노출 확인**

Run: `cd apps/cli && node dist/index.js --version && node dist/index.js add object --help`
Expected: `0.1.9` 출력, `add object` 도움말에 `--kind/--name/--sql/--sql-file` 노출.

- [ ] **Step 9: 커밋**

```bash
git add apps/cli/src/index.ts apps/cli/package.json
git commit -m "feat(cli): add/update/remove object 명령 + 버전 정합 0.1.9 (#28)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 모노레포 전체 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 루트 빌드 + 테스트**

Run: `npm run build && npm run test`
Expected: turbo 파이프라인 전체 성공(domain·cli·mcp-server). 기존 web/api 테스트도 영향 없이 PASS.

- [ ] **Step 2: 실패 시**

Task별 커밋으로 이등분해 회귀 지점 특정. 통과하면 계획 완료.

---

## Self-Review

**1. Spec coverage:**
- ➍ format-diagram → Task 2 ✓ / ddl-generator objects+경고 → Task 1 ✓ / validate-diagram → Task 3 ✓
- ➋ MCP 도구 3종 + 버전 두 곳 → Task 4 ✓ / get_diagram·get_ddl 자동반영 → Task 4 Step 5 명시 ✓
- ➌ CLI 명령 3종 + 버전 정합 + package bump → Task 5 ✓ / get diagram·ddl·setup 자동반영 → Task 5 Interfaces 명시 ✓
- views 유지·web/api 미변경 → 어떤 태스크도 해당 파일 안 건드림 ✓
- `object_raw_sql` 경고코드 → Task 1 Step 3 ✓

**2. Placeholder scan:** TBD/TODO 없음. 모든 코드 스텝에 실제 코드 포함. (Step 2의 `if （` 전각 괄호는 주석으로 ASCII 사용 명시.)

**3. Type consistency:**
- `addObject(doc, {id,kind,name,sql})` — Task 4/5에서 동일 사용 ✓
- `updateObject(doc, objectId, Partial<Omit<DiagramObject,"id">>)` — changes 객체에 kind/name/sql만, id 제외 ✓
- `removeObject(doc, objectId)` — Task 4/5 동일 ✓
- `DdlWarning`에 `entity` 필드 사용(존재하는 optional 필드) ✓
- `object_raw_sql`는 Task 1에서 union 추가 후 사용 ✓

# Column Meta Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 컬럼 행을 PK·FK·NULL·UQ·논리명·이름·타입·삭제 한 줄로 통합하고, 테이블 하단 인덱스 섹션과 DDL COMMENT/INDEX 출력을 추가한다.

**Architecture:** 도메인 레이어(타입·커맨드·DDL)를 먼저 완성한 뒤 UI(EditableTableNode) 를 개편한다. `DiagramIndex` 타입을 신규 추가하고, `removeColumn`/`removeEntity`가 관련 인덱스를 자동 정리하도록 수정한다. 논리명은 기존 `DiagramColumn.comment` 필드를 그대로 사용한다.

**Tech Stack:** TypeScript, Vitest, React, Vanilla Extract CSS, Zustand (useEditorStore)

---

## File Map

### 신규 생성
- `packages/domain/src/commands/index-commands.ts` — addIndex / removeIndex / updateIndex
- `packages/domain/src/commands/index-commands.test.ts` — index command 테스트

### 수정
- `packages/domain/src/types/diagram.type.ts` — DiagramIndex 타입 추가, indexes: DiagramIndex[]
- `packages/domain/src/commands/entity-commands.ts` — updateEntityComment 추가, removeEntity 인덱스 정리
- `packages/domain/src/commands/entity-commands.test.ts` — 신규 테스트 추가
- `packages/domain/src/commands/column-commands.ts` — removeColumn 인덱스 정리
- `packages/domain/src/commands/column-commands.test.ts` — 신규 테스트 추가
- `packages/domain/src/utils/ddl-generator.ts` — COMMENT + CREATE INDEX 출력
- `packages/domain/src/index.ts` — 신규 export 추가
- `apps/web/src/features/editor/components/editable-table-node.css.ts` — 신규 스타일 추가
- `apps/web/src/features/editor/components/EditableTableNode.tsx` — 전면 개편

---

## Task 1: DiagramIndex 타입 추가

**Files:**
- Modify: `packages/domain/src/types/diagram.type.ts`
- Modify: `packages/domain/src/index.ts`

- [ ] **Step 1: diagram.type.ts에 DiagramIndex 추가 및 indexes 타입 교체**

`packages/domain/src/types/diagram.type.ts` 전체를 다음으로 교체:

```typescript
export type DiagramDialect = "postgresql" | "mysql" | "mariadb";

export type RelationshipCardinality = "one-to-one" | "one-to-many" | "many-to-one";

export type ReferentialAction = "cascade" | "restrict" | "set-null" | "no-action";

export interface DiagramColumn {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue: string | null;
  comment: string | null;
  ordinal: number;
}

export interface DiagramEntity {
  id: string;
  name: string;
  logicalName: string | null;
  comment: string | null;
  color: string | null;
  columns: DiagramColumn[];
}

export interface DiagramRelationship {
  id: string;
  name: string;
  sourceEntityId: string;
  sourceColumnIds: string[];
  targetEntityId: string;
  targetColumnIds: string[];
  cardinality: RelationshipCardinality;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
  identifying: boolean;
}

export interface DiagramIndex {
  id: string;
  entityId: string;
  name: string;
  columnIds: string[];
  unique: boolean;
}

export interface DiagramMetadata {
  revision: number;
  stableObjectIds: true;
  createdAt: string;
  updatedAt: string;
}

export interface EntityPosition {
  x: number;
  y: number;
}

export interface DiagramLayout {
  entityPositions: Record<string, EntityPosition>;
}

export interface DiagramDocument {
  format: "erdify.schema.v1";
  id: string;
  name: string;
  dialect: DiagramDialect;
  entities: DiagramEntity[];
  relationships: DiagramRelationship[];
  indexes: DiagramIndex[];
  views: [];
  layout: DiagramLayout;
  metadata: DiagramMetadata;
}

export interface DiagramValidationResult {
  valid: boolean;
  errors: string[];
}
```

- [ ] **Step 2: index.ts에 DiagramIndex export 추가**

`packages/domain/src/index.ts`의 `export type { ... }` 블록에 `DiagramIndex` 추가:

```typescript
export { createEmptyDiagram } from "./schema/create-empty-diagram.js";
export { validateDiagram } from "./validation/validate-diagram.js";
export { addEntity, renameEntity, removeEntity, updateEntityColor, updateEntityComment } from "./commands/entity-commands.js";
export { addColumn, updateColumn, removeColumn } from "./commands/column-commands.js";
export { addRelationship, removeRelationship, updateRelationship } from "./commands/relationship-commands.js";
export { updateEntityPosition } from "./commands/layout-commands.js";
export { addIndex, removeIndex, updateIndex } from "./commands/index-commands.js";
export type {
  DiagramColumn,
  DiagramDialect,
  DiagramDocument,
  DiagramEntity,
  DiagramIndex,
  DiagramLayout,
  DiagramMetadata,
  DiagramRelationship,
  DiagramValidationResult,
  EntityPosition,
  ReferentialAction,
  RelationshipCardinality
} from "./types/index.js";
export { generateDdl } from "./utils/ddl-generator.js";
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit -p packages/domain/tsconfig.json 2>&1 | head -20
```

Expected: 출력 없음

- [ ] **Step 4: 커밋**

```bash
git add packages/domain/src/types/diagram.type.ts packages/domain/src/index.ts
git commit -m "feat(domain): add DiagramIndex type and update indexes field"
```

---

## Task 2: index-commands.ts + 테스트 (TDD)

**Files:**
- Create: `packages/domain/src/commands/index-commands.ts`
- Create: `packages/domain/src/commands/index-commands.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`packages/domain/src/commands/index-commands.test.ts` 생성:

```typescript
import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "./entity-commands.js";
import { addIndex, removeIndex, updateIndex } from "./index-commands.js";
import type { DiagramIndex } from "../types/index.js";

const base = () => addEntity(
  createEmptyDiagram({ id: "d1", name: "Test", dialect: "postgresql" }),
  { id: "e1", name: "users" }
);

const idx = (overrides: Partial<DiagramIndex> = {}): DiagramIndex => ({
  id: "i1", entityId: "e1", name: "idx_users_email",
  columnIds: ["c1"], unique: false,
  ...overrides,
});

describe("addIndex", () => {
  it("adds index to document", () => {
    const doc = addIndex(base(), idx());
    expect(doc.indexes).toHaveLength(1);
    expect(doc.indexes[0]).toEqual(idx());
  });

  it("does not mutate original", () => {
    const original = base();
    addIndex(original, idx());
    expect(original.indexes).toHaveLength(0);
  });
});

describe("removeIndex", () => {
  it("removes index by id", () => {
    let doc = addIndex(base(), idx({ id: "i1" }));
    doc = addIndex(doc, idx({ id: "i2", name: "idx_users_name" }));
    doc = removeIndex(doc, "i1");
    expect(doc.indexes).toHaveLength(1);
    expect(doc.indexes[0].id).toBe("i2");
  });

  it("does nothing for unknown id", () => {
    const doc = addIndex(base(), idx());
    expect(removeIndex(doc, "unknown").indexes).toHaveLength(1);
  });
});

describe("updateIndex", () => {
  it("updates specified fields only", () => {
    let doc = addIndex(base(), idx({ id: "i1", unique: false }));
    doc = updateIndex(doc, "i1", { unique: true, name: "uq_users_email" });
    expect(doc.indexes[0].unique).toBe(true);
    expect(doc.indexes[0].name).toBe("uq_users_email");
    expect(doc.indexes[0].columnIds).toEqual(["c1"]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | tail -10
```

Expected: `Cannot find module './index-commands.js'` 에러

- [ ] **Step 3: index-commands.ts 구현**

`packages/domain/src/commands/index-commands.ts` 생성:

```typescript
import type { DiagramDocument, DiagramIndex } from "../types/index.js";

export function addIndex(
  doc: DiagramDocument,
  index: DiagramIndex
): DiagramDocument {
  return { ...doc, indexes: [...doc.indexes, index] };
}

export function removeIndex(
  doc: DiagramDocument,
  indexId: string
): DiagramDocument {
  return { ...doc, indexes: doc.indexes.filter((i) => i.id !== indexId) };
}

export function updateIndex(
  doc: DiagramDocument,
  indexId: string,
  changes: Partial<Omit<DiagramIndex, "id" | "entityId">>
): DiagramDocument {
  return {
    ...doc,
    indexes: doc.indexes.map((i) =>
      i.id === indexId ? { ...i, ...changes } : i
    ),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | tail -10
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/domain/src/commands/index-commands.ts \
        packages/domain/src/commands/index-commands.test.ts
git commit -m "feat(domain): add addIndex / removeIndex / updateIndex commands"
```

---

## Task 3: updateEntityComment + removeEntity 인덱스 정리

**Files:**
- Modify: `packages/domain/src/commands/entity-commands.ts`
- Modify: `packages/domain/src/commands/entity-commands.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

`packages/domain/src/commands/entity-commands.test.ts` 끝에 추가:

```typescript
import { addIndex } from "./index-commands.js";
import { updateEntityComment } from "./entity-commands.js";

describe("updateEntityComment", () => {
  it("sets comment on entity", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    expect(doc.entities[0].comment).toBe("사용자 테이블");
  });

  it("clears comment when null", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "some comment");
    doc = updateEntityComment(doc, "e1", null);
    expect(doc.entities[0].comment).toBeNull();
  });
});

describe("removeEntity — index cleanup", () => {
  it("removes indexes belonging to the deleted entity", () => {
    let doc = addEntity(base(), { id: "e1", name: "users" });
    doc = addEntity(doc, { id: "e2", name: "orders" });
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_users_email", columnIds: ["c1"], unique: false });
    doc = addIndex(doc, { id: "i2", entityId: "e2", name: "idx_orders_user", columnIds: ["c2"], unique: false });
    doc = removeEntity(doc, "e1");
    expect(doc.indexes).toHaveLength(1);
    expect(doc.indexes[0].id).toBe("i2");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | grep -E "FAIL|PASS|×|✓" | tail -20
```

Expected: `updateEntityComment` 관련 테스트 실패

- [ ] **Step 3: entity-commands.ts 수정**

`packages/domain/src/commands/entity-commands.ts` 전체를 다음으로 교체:

```typescript
import type { DiagramDocument, DiagramEntity, EntityPosition } from "../types/index.js";

export function addEntity(
  doc: DiagramDocument,
  input: { id: string; name: string; position?: EntityPosition }
): DiagramDocument {
  const entity: DiagramEntity = {
    id: input.id,
    name: input.name,
    logicalName: null,
    comment: null,
    color: null,
    columns: []
  };
  const entityPositions = input.position
    ? { ...doc.layout.entityPositions, [input.id]: input.position }
    : doc.layout.entityPositions;
  return {
    ...doc,
    entities: [...doc.entities, entity],
    layout: { ...doc.layout, entityPositions }
  };
}

export function renameEntity(
  doc: DiagramDocument,
  entityId: string,
  name: string
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => (e.id === entityId ? { ...e, name } : e))
  };
}

export function updateEntityColor(
  doc: DiagramDocument,
  entityId: string,
  color: string | null
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => (e.id === entityId ? { ...e, color } : e))
  };
}

export function updateEntityComment(
  doc: DiagramDocument,
  entityId: string,
  comment: string | null
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) => (e.id === entityId ? { ...e, comment } : e))
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
    indexes: doc.indexes.filter((i) => i.entityId !== entityId),
    layout: { ...doc.layout, entityPositions: remainingPositions }
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | tail -10
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/domain/src/commands/entity-commands.ts \
        packages/domain/src/commands/entity-commands.test.ts
git commit -m "feat(domain): add updateEntityComment, cleanup indexes on removeEntity"
```

---

## Task 4: removeColumn 인덱스 정리

**Files:**
- Modify: `packages/domain/src/commands/column-commands.ts`
- Modify: `packages/domain/src/commands/column-commands.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

`packages/domain/src/commands/column-commands.test.ts` 끝에 추가:

```typescript
import { addIndex } from "./index-commands.js";

describe("removeColumn — index cleanup", () => {
  it("removes columnId from indexes and deletes empty indexes", () => {
    let doc = addColumn(base(), "e1", col({ id: "c1" }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "email" }));
    // composite index on c1+c2, simple index on c2
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_composite", columnIds: ["c1", "c2"], unique: false });
    doc = addIndex(doc, { id: "i2", entityId: "e1", name: "idx_simple", columnIds: ["c1"], unique: false });
    doc = removeColumn(doc, "e1", "c1");
    // i1 should still exist with only c2 remaining
    expect(doc.indexes.find((i) => i.id === "i1")?.columnIds).toEqual(["c2"]);
    // i2 had only c1, so it should be deleted
    expect(doc.indexes.find((i) => i.id === "i2")).toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | grep -E "removeColumn" | tail -5
```

Expected: index cleanup 테스트 실패

- [ ] **Step 3: column-commands.ts 수정**

`packages/domain/src/commands/column-commands.ts` 전체를 다음으로 교체:

```typescript
import type { DiagramColumn, DiagramDocument } from "../types/index.js";

export function addColumn(
  doc: DiagramDocument,
  entityId: string,
  column: DiagramColumn
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) =>
      e.id === entityId ? { ...e, columns: [...e.columns, column] } : e
    )
  };
}

export function updateColumn(
  doc: DiagramDocument,
  entityId: string,
  columnId: string,
  changes: Partial<Omit<DiagramColumn, "id">>
): DiagramDocument {
  return {
    ...doc,
    entities: doc.entities.map((e) =>
      e.id === entityId
        ? { ...e, columns: e.columns.map((c) => (c.id === columnId ? { ...c, ...changes } : c)) }
        : e
    )
  };
}

export function removeColumn(
  doc: DiagramDocument,
  entityId: string,
  columnId: string
): DiagramDocument {
  const updatedIndexes = doc.indexes
    .map((idx) => ({ ...idx, columnIds: idx.columnIds.filter((id) => id !== columnId) }))
    .filter((idx) => idx.columnIds.length > 0);

  return {
    ...doc,
    entities: doc.entities.map((e) =>
      e.id === entityId ? { ...e, columns: e.columns.filter((c) => c.id !== columnId) } : e
    ),
    relationships: doc.relationships.map((r) => ({
      ...r,
      sourceColumnIds: r.sourceColumnIds.filter((id) => id !== columnId),
      targetColumnIds: r.targetColumnIds.filter((id) => id !== columnId)
    })),
    indexes: updatedIndexes
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | tail -10
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/domain/src/commands/column-commands.ts \
        packages/domain/src/commands/column-commands.test.ts
git commit -m "feat(domain): cleanup indexes when column is removed"
```

---

## Task 5: DDL 생성기 — COMMENT + INDEX 출력

**Files:**
- Modify: `packages/domain/src/utils/ddl-generator.ts`

- [ ] **Step 1: DDL 테스트 파일 생성**

`packages/domain/src/utils/ddl-generator.test.ts` 생성:

```typescript
import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "../commands/entity-commands.js";
import { addColumn } from "../commands/column-commands.js";
import { addIndex } from "../commands/index-commands.js";
import { updateEntityComment, updateEntityColor } from "../commands/entity-commands.js";
import { updateColumn } from "../commands/column-commands.js";
import { generateDdl } from "./ddl-generator.js";
import type { DiagramColumn } from "../types/index.js";

const col = (overrides: Partial<DiagramColumn>): DiagramColumn => ({
  id: "c1", name: "id", type: "uuid", nullable: false,
  primaryKey: true, unique: false, defaultValue: null, comment: null, ordinal: 0,
  ...overrides,
});

describe("generateDdl — COMMENT (postgresql)", () => {
  it("outputs COMMENT ON TABLE when entity has comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`COMMENT ON TABLE "users" IS '사용자 테이블'`);
  });

  it("outputs COMMENT ON COLUMN for columns with comment", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", comment: "사용자 ID" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`COMMENT ON COLUMN "users"."id" IS '사용자 ID'`);
  });

  it("omits COMMENT ON TABLE when entity comment is null", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const ddl = generateDdl(doc);
    expect(ddl).not.toContain("COMMENT ON TABLE");
  });
});

describe("generateDdl — COMMENT (mysql)", () => {
  it("adds inline COMMENT on column", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", comment: "사용자 ID" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain("COMMENT '사용자 ID'");
  });

  it("adds COMMENT on table closing paren", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    doc = addColumn(doc, "e1", col({ id: "c1" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain("COMMENT='사용자 테이블'");
  });
});

describe("generateDdl — CREATE INDEX", () => {
  it("outputs CREATE INDEX for non-unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "email", primaryKey: false }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_users_email", columnIds: ["c1"], unique: false });
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`CREATE INDEX "idx_users_email" ON "users" ("email")`);
  });

  it("outputs CREATE UNIQUE INDEX for unique index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "email", primaryKey: false }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "uq_users_email", columnIds: ["c1"], unique: true });
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email")`);
  });

  it("supports composite index", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "orders" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "user_id", primaryKey: false }));
    doc = addColumn(doc, "e1", col({ id: "c2", name: "status", primaryKey: false, ordinal: 1 }));
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "idx_orders_user_status", columnIds: ["c1", "c2"], unique: false });
    const ddl = generateDdl(doc);
    expect(ddl).toContain(`CREATE INDEX "idx_orders_user_status" ON "orders" ("user_id", "status")`);
  });

  it("skips index with no columnIds", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addIndex(doc, { id: "i1", entityId: "e1", name: "empty", columnIds: [], unique: false });
    const ddl = generateDdl(doc);
    expect(ddl).not.toContain("CREATE INDEX");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | grep "ddl-generator" | tail -5
```

Expected: 새 테스트들 FAIL

- [ ] **Step 3: DDL 생성기 구현**

`packages/domain/src/utils/ddl-generator.ts` 전체를 다음으로 교체:

```typescript
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
    const pkList = pkCols.map((c) => quote(c.name, dialect)).join(", ");
    lines.push(`  PRIMARY KEY (${pkList})`);
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | tail -10
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/domain/src/utils/ddl-generator.ts \
        packages/domain/src/utils/ddl-generator.test.ts
git commit -m "feat(domain): add COMMENT and CREATE INDEX to DDL output"
```

---

## Task 6: editable-table-node.css.ts — 신규 스타일 추가

**Files:**
- Modify: `apps/web/src/features/editor/components/editable-table-node.css.ts`

- [ ] **Step 1: 기존 파일 끝에 신규 스타일 추가**

`apps/web/src/features/editor/components/editable-table-node.css.ts` 파일 끝 (collaboratorDot 아래)에 다음을 추가:

```typescript
export const tableCommentInput = style({
  flex: 1,
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.3)",
  color: "rgba(255,255,255,0.8)",
  fontStyle: "italic",
  fontSize: 10,
  fontFamily: "sans-serif",
  outline: "none",
  padding: "1px 2px",
  selectors: {
    "&::placeholder": { color: "rgba(255,255,255,0.4)" },
  },
});

export const checkboxCell = style({
  width: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const rowCheckbox = style({
  width: 12,
  height: 12,
  accentColor: vars.color.primary,
  cursor: "pointer",
  margin: 0,
});

export const fkDotCell = style({
  width: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const fkDot = style({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#3b82f6",
  flexShrink: 0,
});

export const logicalNameInput = style({
  flex: 1,
  minWidth: 0,
  fontSize: 10,
  border: "none",
  borderBottom: `1px solid transparent`,
  background: "transparent",
  color: vars.color.textSecondary,
  fontStyle: "italic",
  fontFamily: "monospace",
  outline: "none",
  padding: "1px 2px",
  selectors: {
    "&:focus": { borderBottomColor: vars.color.primary },
    "&::placeholder": { color: vars.color.borderStrong },
  },
});

export const indexSection = style({
  borderTop: `1px dashed ${vars.color.border}`,
  padding: "5px 8px 6px",
});

export const indexSectionHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
});

export const indexSectionLabel = style({
  fontSize: 9,
  fontWeight: 700,
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  flex: 1,
});

export const indexAddBtn = style({
  fontSize: 9,
  color: vars.color.primary,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "monospace",
  padding: 0,
  selectors: {
    "&:hover": { textDecoration: "underline" },
  },
});

export const indexRow = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 3,
  padding: "2px 4px",
  background: vars.color.surfaceTertiary,
  borderRadius: 3,
  border: `1px solid ${vars.color.border}`,
});

export const indexNameInput = style({
  flex: 1,
  minWidth: 0,
  fontSize: 10,
  border: "none",
  background: "transparent",
  color: vars.color.textPrimary,
  fontFamily: "monospace",
  outline: "none",
  padding: "1px 2px",
});

export const indexColsBtn = style({
  fontSize: 9,
  color: vars.color.textSecondary,
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 3,
  padding: "1px 5px",
  cursor: "pointer",
  fontFamily: "monospace",
  whiteSpace: "nowrap",
  maxWidth: 100,
  overflow: "hidden",
  textOverflow: "ellipsis",
  selectors: {
    "&:hover": { borderColor: vars.color.primary },
  },
});

export const indexColsDropdown = style({
  position: "absolute",
  top: "calc(100% + 2px)",
  left: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  boxShadow: vars.shadow.lg,
  zIndex: 9999,
  minWidth: 140,
  padding: "4px 0",
});

export const indexColOption = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  fontSize: 11,
  fontFamily: "monospace",
  cursor: "pointer",
  color: vars.color.textPrimary,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const indexUniqueToggle = style({
  fontSize: 9,
  fontWeight: 700,
  padding: "1px 5px",
  borderRadius: 3,
  border: `1px solid ${vars.color.border}`,
  background: "none",
  cursor: "pointer",
  fontFamily: "monospace",
  whiteSpace: "nowrap",
  flexShrink: 0,
  selectors: {
    "&:hover": { borderColor: vars.color.primary, color: vars.color.primary },
  },
});

export const indexUniqueActive = style({
  background: vars.color.primary,
  color: "#fff",
  borderColor: vars.color.primary,
});

export const indexDeleteBtn = style({
  width: 16,
  height: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  color: vars.color.borderStrong,
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
  flexShrink: 0,
  selectors: {
    "&:hover": { color: vars.color.error },
  },
});
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -20
```

Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/features/editor/components/editable-table-node.css.ts
git commit -m "feat(web): add CSS styles for column meta row and index section"
```

---

## Task 7: EditableTableNode 전면 개편

**Files:**
- Modify: `apps/web/src/features/editor/components/EditableTableNode.tsx`

- [ ] **Step 1: 파일 전체 교체**

`apps/web/src/features/editor/components/EditableTableNode.tsx` 전체를 다음으로 교체:

```tsx
import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  addColumn,
  addIndex,
  removeColumn,
  removeEntity,
  removeIndex,
  renameEntity,
  updateColumn,
  updateEntityColor,
  updateEntityComment,
  updateIndex,
} from "@erdify/domain";
import type { DiagramColumn, DiagramIndex } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType } from "../stores/useEditorStore";
import * as css from "./editable-table-node.css";

const DEFAULT_HEADER_COLOR = "#0064E0";

const PRESET_COLORS = [
  "#374151",
  "#0064E0",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#d97706",
  "#db2777",
  "#0891b2",
];

const COLUMN_TYPES = [
  "varchar(255)", "text", "int", "bigint", "boolean",
  "timestamp", "uuid", "decimal(10,2)", "json", "jsonb",
];

function makeColumn(ordinal: number): DiagramColumn {
  return {
    id: crypto.randomUUID(),
    name: "column",
    type: "varchar(255)",
    nullable: true,
    primaryKey: false,
    unique: false,
    defaultValue: null,
    comment: null,
    ordinal,
  };
}

function makeIndex(entityId: string, entityName: string): DiagramIndex {
  return {
    id: crypto.randomUUID(),
    entityId,
    name: `idx_${entityName}`,
    columnIds: [],
    unique: false,
  };
}

const TypeSelect = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = COLUMN_TYPES.filter((t) =>
    t.toLowerCase().includes(inputVal.toLowerCase())
  );

  const commit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) onChange(trimmed);
    else setInputVal(value);
    setOpen(false);
  };

  return (
    <div className={css.typeSelectWrapper}>
      <input
        className={`${css.typeInput} nodrag`}
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); }}
        onFocus={() => { setInputVal(value); setOpen(true); }}
        onBlur={() => commit(inputVal)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") { e.preventDefault(); commit(inputVal); }
          if (e.key === "Escape") { setInputVal(value); setOpen(false); }
        }}
        placeholder="타입..."
        spellCheck={false}
      />
      {open && filtered.length > 0 && (
        <div className={`${css.typeDropdown} nodrag nopan`}>
          {filtered.map((t) => (
            <button
              key={t}
              type="button"
              className={`${css.typeOption}${t === value ? ` ${css.typeOptionActive}` : ""}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(t); setInputVal(t); setOpen(false); }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ColorPicker = ({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) => {
  const [open, setOpen] = useState(false);
  const current = value ?? DEFAULT_HEADER_COLOR;

  return (
    <div className={css.colorPickerWrapper}>
      <button
        type="button"
        className={`${css.colorSwatch} nodrag`}
        style={{ background: current }}
        onClick={() => setOpen((o) => !o)}
        title="헤더 색상 변경"
      />
      {open && (
        <div className={`${css.colorDropdown} nodrag nopan`}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={css.colorOption}
              style={{ background: c, outline: c === current ? "2px solid #fff" : "none" }}
              onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const IndexColumnSelect = ({
  entityColumns,
  selectedIds,
  onChange,
}: {
  entityColumns: DiagramColumn[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const label = selectedIds.length === 0
    ? "컬럼 선택"
    : selectedIds
        .map((id) => entityColumns.find((c) => c.id === id)?.name ?? id)
        .join(", ");

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className={`${css.indexColsBtn} nodrag`}
        onClick={() => setOpen((o) => !o)}
        title={label}
      >
        {label}
      </button>
      {open && (
        <div className={`${css.indexColsDropdown} nodrag nopan`}>
          {entityColumns.map((col) => (
            <label key={col.id} className={css.indexColOption}>
              <input
                type="checkbox"
                checked={selectedIds.includes(col.id)}
                onChange={() => toggle(col.id)}
                style={{ width: 12, height: 12, accentColor: "#6366f1" }}
              />
              {col.name}
            </label>
          ))}
          {entityColumns.length === 0 && (
            <div style={{ padding: "6px 10px", fontSize: 10, color: "#9ca3af" }}>컬럼 없음</div>
          )}
        </div>
      )}
    </div>
  );
};

export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  const { entity, collaboratorColor } = data;
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const canEdit = useEditorStore((s) => s.canEdit);
  const document = useEditorStore((s) => s.document);

  const fkColumnIds = new Set(
    document?.relationships.flatMap((r) => [...r.sourceColumnIds, ...r.targetColumnIds]) ?? []
  );
  const entityIndexes = document?.indexes.filter((i) => i.entityId === entity.id) ?? [];

  const borderColor = collaboratorColor ?? (selected ? "var(--color-primary, #0064E0)" : "#d1d5db");
  const boxShadow = collaboratorColor
    ? `0 0 0 3px ${collaboratorColor}40`
    : selected
    ? "0 4px 20px rgba(0, 100, 224, 0.18)"
    : "0 1px 4px rgba(0,0,0,0.1)";

  // ─── 읽기 전용 모드 ───
  if (!canEdit) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: `2px solid ${borderColor}`,
          borderRadius: 6,
          minWidth: 180,
          fontFamily: "monospace",
          fontSize: 12,
          boxShadow,
          position: "relative",
        }}
      >
        <Handle type="target" position={Position.Left} />
        {collaboratorColor && (
          <div className={css.collaboratorDot} style={{ background: collaboratorColor }} />
        )}
        <div
          style={{
            background: collaboratorColor ?? entity.color ?? DEFAULT_HEADER_COLOR,
            color: "#ffffff",
            padding: "6px 10px",
            fontWeight: 700,
            borderRadius: "4px 4px 0 0",
            fontSize: 13,
          }}
        >
          {entity.name}
          {entity.comment && (
            <div style={{ fontSize: 10, fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>
              {entity.comment}
            </div>
          )}
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {entity.columns.map((col) => (
            <li
              key={col.id}
              style={{
                padding: "3px 10px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {col.primaryKey && <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 10 }}>PK</span>}
              {fkColumnIds.has(col.id) && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", display: "inline-block", flexShrink: 0 }} />
              )}
              {col.unique && !col.primaryKey && <span style={{ color: "#6366f1", fontSize: 9, fontWeight: 700 }}>UQ</span>}
              <span style={{ flex: 1, color: "#111827" }}>{col.name}</span>
              <span style={{ color: "#6b7280", fontSize: 10 }}>{col.type}</span>
              {col.nullable && <span style={{ color: "#9ca3af" }}>?</span>}
              {col.comment && (
                <span style={{ color: "#9ca3af", fontSize: 9, fontStyle: "italic" }}>{col.comment}</span>
              )}
            </li>
          ))}
          {entity.columns.length === 0 && (
            <li style={{ padding: "4px 10px", color: "#9ca3af", fontStyle: "italic" }}>컬럼 없음</li>
          )}
        </ul>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  // ─── 편집 모드 ───
  return (
    <div
      style={{
        background: "#ffffff",
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        minWidth: 420,
        fontFamily: "monospace",
        fontSize: 12,
        boxShadow,
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} />

      {/* 헤더 */}
      <div className={css.headerEditRow} style={{ background: entity.color ?? DEFAULT_HEADER_COLOR }}>
        <ColorPicker
          value={entity.color ?? null}
          onChange={(color) => applyCommand((doc) => updateEntityColor(doc, entity.id, color))}
        />
        <input
          className={`${css.tableNameInput} nodrag`}
          value={entity.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => renameEntity(doc, entity.id, e.target.value))
          }
        />
        <input
          className={`${css.tableCommentInput} nodrag`}
          value={entity.comment ?? ""}
          placeholder="논리명 (선택)"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => updateEntityComment(doc, entity.id, e.target.value || null))
          }
        />
        <button
          type="button"
          className={`${css.deleteEntityBtn} nodrag`}
          onClick={() => {
            applyCommand((doc) => removeEntity(doc, entity.id));
            setSelectedEntity(null);
          }}
          title="테이블 삭제"
        >
          삭제
        </button>
      </div>

      {/* 컬럼 헤더 레이블 행 */}
      <div className={css.colHeaderRow}>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>PK</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>FK</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>NULL</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>UQ</span>
        <span style={{ flex: 1 }} className={css.colHeaderLabel}>논리명</span>
        <span style={{ flex: 1 }} className={css.colHeaderLabel}>컬럼명</span>
        <span style={{ width: 88 }} className={css.colHeaderLabel}>타입</span>
        <span style={{ width: 18 }} />
      </div>

      {/* 컬럼 행 */}
      {entity.columns.map((col) => (
        <div key={col.id} className={css.editColumnItem}>
          {/* PK */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.primaryKey}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { primaryKey: e.target.checked }))
              }
            />
          </div>
          {/* FK (read-only) */}
          <div className={css.fkDotCell}>
            {fkColumnIds.has(col.id) && <span className={css.fkDot} />}
          </div>
          {/* NULL */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.nullable}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { nullable: e.target.checked }))
              }
            />
          </div>
          {/* UQ */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.unique}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { unique: e.target.checked }))
              }
            />
          </div>
          {/* 논리명 */}
          <input
            className={`${css.logicalNameInput} nodrag`}
            value={col.comment ?? ""}
            placeholder="논리명..."
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { comment: e.target.value || null }))
            }
          />
          {/* 컬럼명 */}
          <input
            className={`${css.columnNameInput} nodrag`}
            value={col.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { name: e.target.value }))
            }
          />
          {/* 타입 */}
          <TypeSelect
            value={col.type}
            onChange={(val) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { type: val }))
            }
          />
          {/* 삭제 */}
          <button
            type="button"
            className={`${css.deleteColBtn} nodrag`}
            onClick={() => applyCommand((doc) => removeColumn(doc, entity.id, col.id))}
            title="컬럼 삭제"
          >
            ×
          </button>
        </div>
      ))}

      {/* 컬럼 추가 버튼 */}
      <div className={css.addColumnWrapper}>
        <button
          type="button"
          className={`${css.addColumnBtn} nodrag`}
          onClick={() =>
            applyCommand((doc) => addColumn(doc, entity.id, makeColumn(entity.columns.length)))
          }
        >
          + 컬럼 추가
        </button>
      </div>

      {/* 인덱스 섹션 */}
      <div className={css.indexSection}>
        <div className={css.indexSectionHeader}>
          <span className={css.indexSectionLabel}>Indexes</span>
          <button
            type="button"
            className={`${css.indexAddBtn} nodrag`}
            onClick={() =>
              applyCommand((doc) => addIndex(doc, makeIndex(entity.id, entity.name)))
            }
          >
            + 추가
          </button>
        </div>

        {entityIndexes.map((idx) => (
          <div key={idx.id} className={css.indexRow}>
            <input
              className={`${css.indexNameInput} nodrag`}
              value={idx.name}
              placeholder="인덱스명..."
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                applyCommand((doc) => updateIndex(doc, idx.id, { name: e.target.value }))
              }
            />
            <IndexColumnSelect
              entityColumns={entity.columns}
              selectedIds={idx.columnIds}
              onChange={(ids) => applyCommand((doc) => updateIndex(doc, idx.id, { columnIds: ids }))}
            />
            <button
              type="button"
              className={`${css.indexUniqueToggle}${idx.unique ? ` ${css.indexUniqueActive}` : ""} nodrag`}
              onClick={() => applyCommand((doc) => updateIndex(doc, idx.id, { unique: !idx.unique }))}
            >
              {idx.unique ? "UNIQUE" : "INDEX"}
            </button>
            <button
              type="button"
              className={`${css.indexDeleteBtn} nodrag`}
              onClick={() => applyCommand((doc) => removeIndex(doc, idx.id))}
              title="인덱스 삭제"
            >
              ×
            </button>
          </div>
        ))}

        {entityIndexes.length === 0 && (
          <div style={{ fontSize: 9, color: "#c4c9d4", fontStyle: "italic", paddingLeft: 2 }}>
            인덱스 없음
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
};
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -30
```

Expected: 출력 없음. 에러 있으면 수정 후 재확인.

- [ ] **Step 3: 도메인 전체 테스트 통과 확인**

```bash
cd packages/domain && pnpm test --run 2>&1 | tail -10
```

Expected: 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/editor/components/EditableTableNode.tsx
git commit -m "feat(web): redesign EditableTableNode with single-row columns, FK/UQ/NULL, index section"
```

---

## 검증 체크리스트

전체 구현 완료 후 확인:

- [ ] `cd packages/domain && pnpm test --run` → 모든 테스트 PASS
- [ ] `npx tsc --noEmit -p apps/web/tsconfig.json` → 출력 없음
- [ ] `npx tsc --noEmit -p packages/domain/tsconfig.json` → 출력 없음
- [ ] 편집기에서 컬럼 추가 → PK/FK/NULL/UQ/논리명/이름/타입 한 줄 확인
- [ ] 관계가 있는 컬럼에 FK 파란 점 자동 표시 확인
- [ ] 테이블 헤더에 논리명 입력 → entity.comment 저장 확인
- [ ] 인덱스 추가 → 이름 입력, 컬럼 선택, UNIQUE 토글, 삭제 확인
- [ ] DDL Export → COMMENT ON TABLE / COLUMN 출력 확인 (PostgreSQL)
- [ ] DDL Export → MySQL에서 인라인 COMMENT, 테이블 COMMENT= 출력 확인
- [ ] DDL Export → CREATE INDEX / CREATE UNIQUE INDEX 출력 확인
- [ ] 컬럼 삭제 시 해당 컬럼 참조 인덱스 자동 정리 확인
- [ ] 테이블 삭제 시 해당 테이블 인덱스 모두 삭제 확인

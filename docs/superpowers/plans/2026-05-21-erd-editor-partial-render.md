# ERD Editor 부분 렌더링 성능 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 300개 테이블이 있는 ERD 편집 화면에서 한 테이블만 수정할 때 해당 테이블 노드 1개만 재렌더링되도록 개선한다.

**Architecture:** `EditableTableNode`가 `document` 전체를 구독하는 것이 근본 원인이다. `DiagramSlice`에 `fkColumnIds`, `indexesByEntityId`, `allSchemas` 파생 상태를 추가하고, 관련 부분이 변경될 때만 새 객체를 생성하여 identity를 보존한다. `EditableTableNode`는 이 세 개의 granular selector만 구독하고 `React.memo`로 감싸 불필요한 재렌더링을 차단한다.

**Tech Stack:** React 19, Zustand v5, `@xyflow/react` v12, Vitest, @testing-library/react

---

## File Structure

| 파일 | 변경 내용 |
|------|-----------|
| `apps/web/src/features/editor/store/diagramSlice.ts` | `fkColumnIds`, `indexesByEntityId`, `allSchemas` 파생 상태 추가, 각 action에서 identity-preserving 업데이트 |
| `apps/web/src/features/editor/store/editor-store.types.ts` | `DiagramSlice` interface에 3개 파생 상태 타입 추가 |
| `apps/web/src/features/editor/components/EditableTableNode/index.tsx` | `document` 구독 제거, 3개 granular selector 사용, `React.memo` 적용 |
| `apps/web/src/features/editor/components/EditorCanvas.tsx` | `allSchemas` useMemo → store 구독으로 교체 |
| `apps/web/src/features/editor/store/__tests__/diagramSlice.test.ts` | 파생 상태 identity 보존 테스트 신규 생성 |

---

### Task 1: `DiagramSlice`에 파생 상태 추가

**Files:**
- Modify: `apps/web/src/features/editor/store/diagramSlice.ts`
- Modify: `apps/web/src/features/editor/store/editor-store.types.ts`
- Create: `apps/web/src/features/editor/store/__tests__/diagramSlice.test.ts`

- [ ] **Step 1: 테스트 파일 생성 및 failing 테스트 작성**

`apps/web/src/features/editor/store/__tests__/diagramSlice.test.ts` 파일을 생성하고 아래 내용을 작성:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "zustand";
import type { EditorState } from "../editor-store.types";
import { createDiagramSlice } from "../diagramSlice";
import { createUISlice } from "../uiSlice";
import { createCollaboratorsSlice } from "../collaboratorsSlice";
import { createPendingSlice } from "../pendingSlice";
import type { DiagramDocument } from "@erdify/domain";

const makeDoc = (overrides: Partial<DiagramDocument> = {}): DiagramDocument => ({
  format: "erdify.schema.v1" as const,
  entities: [
    { id: "e1", name: "users", columns: [{ id: "c1", name: "id", type: "bigint", primaryKey: true, nullable: false, unique: false }], seedData: [] },
    { id: "e2", name: "posts", columns: [{ id: "c2", name: "id", type: "bigint", primaryKey: true, nullable: false, unique: false }, { id: "c3", name: "user_id", type: "bigint", primaryKey: false, nullable: false, unique: false }], seedData: [] },
  ],
  relationships: [
    { id: "r1", name: "fk_posts_users", sourceEntityId: "e2", sourceColumnIds: ["c3"], targetEntityId: "e1", targetColumnIds: ["c1"], cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false },
  ],
  indexes: [
    { id: "i1", entityId: "e2", name: "idx_user_id", columnIds: ["c3"], unique: false },
  ],
  layout: { entityPositions: { e1: { x: 0, y: 0 }, e2: { x: 300, y: 0 } } },
  metadata: { revision: 1, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  ...overrides,
});

const makeStore = () =>
  createStore<EditorState>()((...a) => ({
    ...createDiagramSlice(...a),
    ...createUISlice(...a),
    ...createCollaboratorsSlice(...a),
    ...createPendingSlice(...a),
  }));

describe("DiagramSlice - derived state", () => {
  it("setDocument: fkColumnIds에 relationship의 모든 column id가 포함된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const { fkColumnIds } = store.getState();
    expect(fkColumnIds.has("c3")).toBe(true);
    expect(fkColumnIds.has("c1")).toBe(true);
    expect(fkColumnIds.has("c2")).toBe(false);
  });

  it("setDocument: indexesByEntityId에 entityId별 index 배열이 매핑된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const { indexesByEntityId } = store.getState();
    expect(indexesByEntityId.get("e2")).toHaveLength(1);
    expect(indexesByEntityId.get("e2")![0].id).toBe("i1");
    expect(indexesByEntityId.get("e1")).toBeUndefined();
  });

  it("setDocument: allSchemas는 entity의 schema 목록이다 (schema 없으면 빈 배열)", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    expect(store.getState().allSchemas).toEqual([]);
  });

  it("applyCommand: entity만 변경 시 fkColumnIds identity가 유지된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const before = store.getState().fkColumnIds;

    // entity 이름만 변경 (relationship/index 변경 없음)
    store.getState().applyCommand((doc) => ({
      ...doc,
      entities: doc.entities.map((e) =>
        e.id === "e1" ? { ...e, name: "users_renamed" } : e
      ),
    }));

    const after = store.getState().fkColumnIds;
    expect(after).toBe(before); // 동일 참조
  });

  it("applyCommand: relationship 변경 시 fkColumnIds identity가 교체된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const before = store.getState().fkColumnIds;

    store.getState().applyCommand((doc) => ({
      ...doc,
      relationships: [],
    }));

    const after = store.getState().fkColumnIds;
    expect(after).not.toBe(before); // 새 참조
    expect(after.size).toBe(0);
  });

  it("applyCommand: index만 변경 시 indexesByEntityId identity가 교체된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const before = store.getState().indexesByEntityId;

    store.getState().applyCommand((doc) => ({
      ...doc,
      indexes: [],
    }));

    expect(store.getState().indexesByEntityId).not.toBe(before);
    expect(store.getState().indexesByEntityId.size).toBe(0);
  });

  it("applyCommand: entity/index/relationship 모두 변경 없으면 파생 상태 identity 전부 유지", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const { fkColumnIds: fkBefore, indexesByEntityId: idxBefore, allSchemas: schBefore } = store.getState();

    // layout만 변경
    store.getState().applyCommand((doc) => ({
      ...doc,
      layout: { entityPositions: { e1: { x: 100, y: 0 }, e2: { x: 400, y: 0 } } },
    }));

    const { fkColumnIds: fkAfter, indexesByEntityId: idxAfter, allSchemas: schAfter } = store.getState();
    expect(fkAfter).toBe(fkBefore);
    expect(idxAfter).toBe(idxBefore);
    expect(schAfter).toBe(schBefore);
  });
});
```

- [ ] **Step 2: 테스트 실행 - FAIL 확인**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
pnpm --filter @erdify/web test -- --reporter=verbose apps/web/src/features/editor/store/__tests__/diagramSlice.test.ts
```

Expected: FAIL — `fkColumnIds`, `indexesByEntityId`, `allSchemas` is not a property of store state

- [ ] **Step 3: `editor-store.types.ts`에 타입 추가**

`apps/web/src/features/editor/store/editor-store.types.ts`를 열어 `DiagramSlice` import 위에 아래 타입을 추가하고, `DiagramSlice`가 사용할 수 있도록 re-export:

파일 상단 import 아래에 추가:
```typescript
import type { DiagramIndex } from "@erdify/domain";
```

`EditorState` 타입 위에 아래 추가 (실제로 DiagramSlice interface는 diagramSlice.ts에 있으므로 타입만 export):
```typescript
export type IndexesByEntityId = Map<string, DiagramIndex[]>;
```

- [ ] **Step 4: `diagramSlice.ts`에 파생 상태 추가**

`apps/web/src/features/editor/store/diagramSlice.ts` 전체를 아래로 교체:

```typescript
// apps/web/src/features/editor/stores/diagramSlice.ts
import type { Edge, NodeChange } from "@xyflow/react";
import { applyNodeChanges as applyXyflowNodeChanges } from "@xyflow/react";
import type { DiagramDocument, DiagramIndex } from "@erdify/domain";
import type { StateCreator } from "zustand";
import type { EditableTableNodeType } from "./editor-store.types";
import { docToEdges, docToNodes, updateNodes } from "./editor-store.helpers";
import type { EditorState } from "./editor-store.types";
import { getSchemasFromDocument } from "@/shared/utils/schema-colors";

const HISTORY_LIMIT = 50;

function computeFkColumnIds(doc: DiagramDocument): Set<string> {
  return new Set(
    doc.relationships.flatMap((r) => [...r.sourceColumnIds, ...r.targetColumnIds])
  );
}

function computeIndexesByEntityId(doc: DiagramDocument): Map<string, DiagramIndex[]> {
  const map = new Map<string, DiagramIndex[]>();
  for (const idx of doc.indexes) {
    const existing = map.get(idx.entityId);
    if (existing) {
      existing.push(idx);
    } else {
      map.set(idx.entityId, [idx]);
    }
  }
  return map;
}

export interface DiagramSlice {
  document: DiagramDocument | null;
  nodes: EditableTableNodeType[];
  edges: Edge[];
  isDirty: boolean;
  canEdit: boolean;
  history: DiagramDocument[];
  // 파생 상태: 관련 부분이 변경될 때만 새 객체 생성
  fkColumnIds: Set<string>;
  indexesByEntityId: Map<string, DiagramIndex[]>;
  allSchemas: string[];
  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  applyNodeChanges: (changes: NodeChange<EditableTableNodeType>[]) => void;
  setCanEdit: (canEdit: boolean) => void;
  clearDirty: () => void;
  undo: () => void;
}

export const createDiagramSlice: StateCreator<EditorState, [], [], DiagramSlice> = (set, get) => ({
  document: null,
  nodes: [],
  edges: [],
  isDirty: false,
  canEdit: false,
  history: [],
  fkColumnIds: new Set(),
  indexesByEntityId: new Map(),
  allSchemas: [],

  setDocument: (doc) =>
    set((state) => ({
      document: doc,
      nodes: docToNodes(doc, state.collaborators),
      edges: docToEdges(doc),
      isDirty: false,
      history: [],
      fkColumnIds: computeFkColumnIds(doc),
      indexesByEntityId: computeIndexesByEntityId(doc),
      allSchemas: getSchemasFromDocument(doc.entities),
    })),

  applyCommand: (fn) => {
    const { document, nodes, collaborators, edges, history } = get();
    if (!document) return;
    const next = fn(document);

    const relationshipsChanged = next.relationships !== document.relationships;
    const indexesChanged = next.indexes !== document.indexes;
    const entitiesChanged = next.entities !== document.entities;

    set({
      document: next,
      nodes: updateNodes(document, next, nodes, collaborators),
      edges: relationshipsChanged ? docToEdges(next) : edges,
      isDirty: true,
      history: [...history.slice(-(HISTORY_LIMIT - 1)), document],
      fkColumnIds: relationshipsChanged ? computeFkColumnIds(next) : get().fkColumnIds,
      indexesByEntityId: indexesChanged ? computeIndexesByEntityId(next) : get().indexesByEntityId,
      allSchemas: entitiesChanged ? getSchemasFromDocument(next.entities) : get().allSchemas,
    });
  },

  applyNodeChanges: (changes) => {
    const { nodes } = get();
    set({ nodes: applyXyflowNodeChanges(changes, nodes) });
  },

  setCanEdit: (canEdit) => set({ canEdit }),
  clearDirty: () => set({ isDirty: false }),

  undo: () => {
    const { history, collaborators } = get();
    const prev = history[history.length - 1];
    if (!prev) return;
    set({
      document: prev,
      nodes: docToNodes(prev, collaborators),
      edges: docToEdges(prev),
      isDirty: true,
      history: history.slice(0, -1),
      fkColumnIds: computeFkColumnIds(prev),
      indexesByEntityId: computeIndexesByEntityId(prev),
      allSchemas: getSchemasFromDocument(prev.entities),
    });
  },
});
```

- [ ] **Step 5: 테스트 실행 - PASS 확인**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
pnpm --filter @erdify/web test -- --reporter=verbose apps/web/src/features/editor/store/__tests__/diagramSlice.test.ts
```

Expected: 모든 테스트 PASS

- [ ] **Step 6: 타입체크**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
pnpm --filter @erdify/web typecheck
```

Expected: 오류 없음

- [ ] **Step 7: Commit**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
git add apps/web/src/features/editor/store/diagramSlice.ts \
        apps/web/src/features/editor/store/__tests__/diagramSlice.test.ts
git commit -m "perf: add derived state (fkColumnIds, indexesByEntityId, allSchemas) to DiagramSlice with identity preservation"
```

---

### Task 2: `EditableTableNode`에 granular selector 적용 + `React.memo`

**Files:**
- Modify: `apps/web/src/features/editor/components/EditableTableNode/index.tsx`

- [ ] **Step 1: 파일 상단 변경 — import 및 empty fallback 상수 추가**

`apps/web/src/features/editor/components/EditableTableNode/index.tsx`의 import 섹션에서 아래 두 줄을 **제거**:

```typescript
import { getSchemaColor, getSchemasFromDocument } from "@/shared/utils/schema-colors";
```

아래로 교체 (`getSchemasFromDocument` 제거):
```typescript
import { getSchemaColor } from "@/shared/utils/schema-colors";
```

그리고 파일 맨 위 (`export const EditableTableNode` 바로 위)에 추가:
```typescript
import type { DiagramIndex } from "@erdify/domain";

const EMPTY_INDEXES: DiagramIndex[] = [];
```

- [ ] **Step 2: `document` 구독 제거 및 granular selector 3개로 교체**

`EditableTableNode` 함수 내부에서 아래 라인을 **제거**:

```typescript
const document = useEditorStore((s) => s.document);
```

그리고 아래 3개로 교체:

```typescript
const fkColumnIds = useEditorStore((s) => s.fkColumnIds);
const entityIndexes = useEditorStore((s) => s.indexesByEntityId.get(entity.id) ?? EMPTY_INDEXES);
const allSchemas = useEditorStore((s) => s.allSchemas);
```

- [ ] **Step 3: `document`를 쓰던 파생 계산 3개 제거**

컴포넌트 내부에서 아래 3줄을 **제거**:

```typescript
const fkColumnIds = new Set(
  document?.relationships.flatMap((r) => [...r.sourceColumnIds, ...r.targetColumnIds]) ?? []
);
const entityIndexes = document?.indexes.filter((i) => i.entityId === entity.id) ?? [];
const allSchemas = document ? getSchemasFromDocument(document.entities) : [];
```

이미 Step 2에서 선언했으므로 중복 없음.

- [ ] **Step 4: `React.memo` 적용**

파일 맨 아래의 export를 변경:

기존:
```typescript
export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
```

`React.memo`로 감싸려면 함수를 내부 이름으로 정의 후 export:

파일 상단 import에 `memo` 추가:
```typescript
import { useState, useRef, memo } from "react";
```

파일 내 `export const EditableTableNode = ...` 선언을 아래 패턴으로 변경:

```typescript
const EditableTableNodeInner = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  // ... 기존 함수 본문 그대로
};

export const EditableTableNode = memo(EditableTableNodeInner);
```

- [ ] **Step 5: 타입체크**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
pnpm --filter @erdify/web typecheck
```

Expected: 오류 없음

- [ ] **Step 6: 전체 테스트 통과 확인**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
pnpm --filter @erdify/web test
```

Expected: 전체 PASS (커버리지 threshold 포함)

- [ ] **Step 7: Commit**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
git add apps/web/src/features/editor/components/EditableTableNode/index.tsx
git commit -m "perf: replace document subscription with granular selectors and wrap EditableTableNode in React.memo"
```

---

### Task 3: `EditorCanvas`에서 `allSchemas` 중복 계산 제거

**Files:**
- Modify: `apps/web/src/features/editor/components/EditorCanvas.tsx`

- [ ] **Step 1: `allSchemas` useMemo를 store 구독으로 교체**

`EditorCanvas.tsx`에서:

**제거할 코드** (line 212–215):
```typescript
const allSchemas = useMemo(
  () => (document ? getSchemasFromDocument(document.entities) : []),
  [document]
);
```

**추가할 코드** (다른 `useEditorStore` 구독들 옆에):
```typescript
const allSchemas = useEditorStore((s) => s.allSchemas);
```

- [ ] **Step 2: 사용하지 않는 import 제거**

`getSchemasFromDocument`가 `EditorCanvas`에서 더 이상 사용되지 않으면 import에서 제거:

```typescript
// 기존
import { getSchemaColor, getSchemasFromDocument } from "@/shared/utils/schema-colors";

// 변경 후
import { getSchemaColor } from "@/shared/utils/schema-colors";
```

단, `getSchemaColor`는 `ClickableMiniMap` 내부에서 여전히 쓰이므로 유지.

- [ ] **Step 3: `zoneNodes` useMemo 의존성 배열 업데이트**

기존 `zoneNodes` useMemo는 `[document, groupViewEnabled, allSchemas]`를 의존성으로 가진다. `allSchemas`가 이제 store에서 직접 오므로 의존성 배열은 그대로 유지해도 되지만, `document` 의존성이 남아있어도 동작에는 문제 없음.

단, `document`가 `allSchemas` 계산을 위해서만 쓰였던 것이 아니라 `zoneNodes` 내에서 `document.entities`, `document.layout.entityPositions`를 직접 참조하므로 그대로 유지.

- [ ] **Step 4: 타입체크 + 전체 테스트**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
pnpm --filter @erdify/web typecheck && pnpm --filter @erdify/web test
```

Expected: 오류 없음, 전체 PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
git add apps/web/src/features/editor/components/EditorCanvas.tsx
git commit -m "perf: replace allSchemas useMemo with store subscription in EditorCanvas"
```

---

## 최종 확인

변경 후 기대되는 동작:

| 시나리오 | 변경 전 | 변경 후 |
|----------|---------|---------|
| 테이블 A의 컬럼 이름 수정 | 300개 노드 전체 재렌더링 | 테이블 A 노드 1개만 재렌더링 |
| 관계(FK) 추가/제거 | 300개 노드 전체 재렌더링 | 300개 노드 재렌더링 (fkColumnIds 변경으로 불가피) |
| 인덱스 추가/제거 | 300개 노드 전체 재렌더링 | 해당 entity 노드만 재렌더링 |
| 화면 이동(pan) | document 구독 노드들 paint overhead | 구독 없어 순수 CSS transform |

> React DevTools Profiler에서 "Highlight updates when components render"를 켜고 컬럼 수정 시 1개 노드만 하이라이트되는지 확인할 것.

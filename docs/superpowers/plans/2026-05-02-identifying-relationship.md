# Identifying Relationship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ERD 캔버스에서 식별 관계(실선)와 비식별 관계(점선)를 구분해 표시하고, 관계선 클릭으로 패널에서 토글할 수 있게 한다.

**Architecture:** `DiagramRelationship` 타입에 `identifying: boolean` 필드를 추가한다. `EditorCanvas`는 `identifying` 값에 따라 실선/점선으로 엣지를 렌더링하고, 엣지 클릭 시 `selectedRelationshipId`를 store에 저장해 `RelationshipPanel`을 띄운다. `RelationshipPanel`에서 식별/비식별 전환이 가능하며 `updateRelationship` 도메인 커맨드로 저장된다.

**Tech Stack:** TypeScript, React 19, Zustand, React Flow (`@xyflow/react`), vanilla-extract, Vitest

---

## File Map

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `packages/domain/src/types/diagram.type.ts` | 수정 | `identifying: boolean` 필드 추가 |
| `packages/domain/src/commands/relationship-commands.ts` | 수정 | `updateRelationship` 커맨드 추가 |
| `packages/domain/src/commands/relationship-commands.test.ts` | 수정 | fixture에 `identifying` 추가, `updateRelationship` 테스트 추가 |
| `packages/domain/src/index.ts` | 수정 | `updateRelationship` export 추가 |
| `apps/web/src/features/editor/stores/useEditorStore.ts` | 수정 | `selectedRelationshipId` 상태 + `setSelectedRelationship` 액션 추가 |
| `apps/web/src/features/editor/components/EditorCanvas.tsx` | 수정 | 실선/점선 엣지 렌더링, 엣지 클릭 핸들러, 신규 관계 `identifying: false` 기본값 |
| `apps/web/src/features/editor/components/RelationshipPanel.tsx` | 신규 생성 | 관계 속성 편집 패널 (식별/비식별 토글, cardinality, onDelete/onUpdate) |
| `apps/web/src/features/editor/components/relationship-panel.css.ts` | 신규 생성 | RelationshipPanel vanilla-extract 스타일 |
| `apps/web/src/features/editor/pages/EditorPage.tsx` | 수정 | `selectedRelationshipId` 구독, RelationshipPanel 렌더링 |

---

## Task 1: 도메인 타입에 `identifying` 필드 추가

**Files:**
- Modify: `packages/domain/src/types/diagram.type.ts`
- Modify: `packages/domain/src/commands/relationship-commands.test.ts`

- [ ] **Step 1: 타입 수정**

`packages/domain/src/types/diagram.type.ts`의 `DiagramRelationship` 인터페이스를 아래와 같이 수정한다:

```typescript
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
```

- [ ] **Step 2: 테스트 fixture에 `identifying` 추가**

`packages/domain/src/commands/relationship-commands.test.ts`의 `rel()` 함수를 수정한다:

```typescript
const rel = (): DiagramRelationship => ({
  id: "r1", name: "fk_orders_users",
  sourceEntityId: "e2", sourceColumnIds: ["c_user_id"],
  targetEntityId: "e1", targetColumnIds: ["c_id"],
  cardinality: "many-to-one", onDelete: "restrict", onUpdate: "no-action",
  identifying: false,
});
```

- [ ] **Step 3: 타입 체크로 검증**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify
pnpm typecheck
```

Expected: 에러 없음 (identifying 미설정 기존 코드가 있다면 TypeScript가 에러를 잡아줌 — 해당 파일들에 `identifying: false` 기본값 추가 필요)

- [ ] **Step 4: 기존 테스트 통과 확인**

```bash
pnpm --filter @erdify/domain test
```

Expected: 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/domain/src/types/diagram.type.ts packages/domain/src/commands/relationship-commands.test.ts
git commit -m "feat(domain): add identifying field to DiagramRelationship"
```

---

## Task 2: `updateRelationship` 도메인 커맨드 추가

**Files:**
- Modify: `packages/domain/src/commands/relationship-commands.ts`
- Modify: `packages/domain/src/commands/relationship-commands.test.ts`
- Modify: `packages/domain/src/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/domain/src/commands/relationship-commands.test.ts` 끝에 추가:

```typescript
import { updateRelationship } from "./relationship-commands.js";

describe("updateRelationship", () => {
  it("updates specified fields on the relationship", () => {
    const doc = addRelationship(base(), rel());
    const updated = updateRelationship(doc, "r1", { identifying: true, cardinality: "one-to-one" });
    expect(updated.relationships[0].identifying).toBe(true);
    expect(updated.relationships[0].cardinality).toBe("one-to-one");
    expect(updated.relationships[0].name).toBe("fk_orders_users");
  });

  it("does not mutate original", () => {
    const doc = addRelationship(base(), rel());
    updateRelationship(doc, "r1", { identifying: true });
    expect(doc.relationships[0].identifying).toBe(false);
  });

  it("ignores unknown id", () => {
    const doc = addRelationship(base(), rel());
    const result = updateRelationship(doc, "nonexistent", { identifying: true });
    expect(result.relationships[0].identifying).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/domain test
```

Expected: `updateRelationship is not a function` 에러

- [ ] **Step 3: `updateRelationship` 구현**

`packages/domain/src/commands/relationship-commands.ts`에 추가:

```typescript
export function updateRelationship(
  doc: DiagramDocument,
  relationshipId: string,
  patch: Partial<Omit<DiagramRelationship, "id">>
): DiagramDocument {
  return {
    ...doc,
    relationships: doc.relationships.map((r) =>
      r.id === relationshipId ? { ...r, ...patch } : r
    ),
  };
}
```

- [ ] **Step 4: index.ts에 export 추가**

`packages/domain/src/index.ts`의 relationship export 줄을 수정:

```typescript
export { addRelationship, removeRelationship, updateRelationship } from "./commands/relationship-commands.js";
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/domain test
```

Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add packages/domain/src/commands/relationship-commands.ts packages/domain/src/commands/relationship-commands.test.ts packages/domain/src/index.ts
git commit -m "feat(domain): add updateRelationship command"
```

---

## Task 3: store에 `selectedRelationshipId` 상태 추가

**Files:**
- Modify: `apps/web/src/features/editor/stores/useEditorStore.ts`

- [ ] **Step 1: `EditorState` 인터페이스에 필드 추가**

`apps/web/src/features/editor/stores/useEditorStore.ts`의 `EditorState` 인터페이스에 추가:

```typescript
interface EditorState {
  // 기존 필드들...
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;          // 추가
  // 기존 액션들...
  setSelectedEntity: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;  // 추가
}
```

- [ ] **Step 2: 초기 상태 및 액션 구현 추가**

`create(...)` 콜백 안에서 초기값과 액션을 추가한다. `selectedEntityId: null` 초기값 옆에:

```typescript
selectedRelationshipId: null,
```

`setSelectedEntity` 정의 옆에:

```typescript
setSelectedRelationship: (id) => set({ selectedRelationshipId: id }),
```

- [ ] **Step 3: 엔티티 선택 시 관계 선택 해제 (상호 배타적)**

`setSelectedEntity` 구현을 수정해 관계 선택을 초기화한다:

```typescript
setSelectedEntity: (id) => set({ selectedEntityId: id, selectedRelationshipId: null }),
```

마찬가지로 `setSelectedRelationship`도:

```typescript
setSelectedRelationship: (id) => set({ selectedRelationshipId: id, selectedEntityId: null }),
```

- [ ] **Step 4: 타입 체크**

```bash
pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/editor/stores/useEditorStore.ts
git commit -m "feat(editor): add selectedRelationshipId state to editor store"
```

---

## Task 4: `EditorCanvas` 엣지 스타일 및 클릭 핸들러 업데이트

**Files:**
- Modify: `apps/web/src/features/editor/components/EditorCanvas.tsx`

- [ ] **Step 1: import에 `updateRelationship` 추가**

`EditorCanvas.tsx` 상단 import를 수정:

```typescript
import { updateEntityPosition, addRelationship, removeRelationship } from "@erdify/domain";
```
→
```typescript
import { updateEntityPosition, addRelationship, removeRelationship } from "@erdify/domain";
```

그리고 store에서 `setSelectedRelationship` 구독:

```typescript
const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);
```

- [ ] **Step 2: 엣지 스타일 로직을 식별/비식별에 따라 분기**

기존 `EDGE_STYLE` 상수와 `edges` 매핑을 아래로 교체:

```typescript
const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "#6366f1",
  width: 16,
  height: 16,
} as const;

const edges: Edge[] = document.relationships.map((rel) => ({
  id: rel.id,
  source: rel.sourceEntityId,
  target: rel.targetEntityId,
  type: "smoothstep",
  label: rel.name || undefined,
  labelStyle: { fontSize: 11, fill: "#374151" },
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
  style: {
    stroke: "#6366f1",
    strokeWidth: 1.5,
    ...(rel.identifying ? {} : { strokeDasharray: "6 3" }),
  },
  markerEnd: EDGE_MARKER,
}));
```

- [ ] **Step 3: 신규 관계 생성 시 `identifying: false` 기본값 추가**

`onConnect` 함수 내 `relationship` 객체에 추가:

```typescript
const relationship: DiagramRelationship = {
  id: crypto.randomUUID(),
  name: "",
  sourceEntityId: connection.source,
  sourceColumnIds: [],
  targetEntityId: connection.target,
  targetColumnIds: [],
  cardinality: "many-to-one",
  onDelete: "no-action",
  onUpdate: "no-action",
  identifying: false,
};
```

- [ ] **Step 4: 엣지 클릭 핸들러 추가**

`onEdgesChange` 아래에 추가:

```typescript
function onEdgeClick(_: MouseEvent, edge: Edge) {
  setSelectedRelationship(edge.id);
}
```

그리고 `<ReactFlow>` 컴포넌트에 prop 추가:

```tsx
<ReactFlow
  ...
  onEdgeClick={onEdgeClick}
  onPaneClick={onPaneClick}
  ...
>
```

`onPaneClick`에서 관계 선택도 초기화:

```typescript
function onPaneClick() {
  setSelectedEntity(null);
  setSelectedRelationship(null);
}
```

- [ ] **Step 5: 타입 체크**

```bash
pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/features/editor/components/EditorCanvas.tsx
git commit -m "feat(editor): render identifying/non-identifying edge styles, add edge click"
```

---

## Task 5: `RelationshipPanel` 컴포넌트 생성

**Files:**
- Create: `apps/web/src/features/editor/components/relationship-panel.css.ts`
- Create: `apps/web/src/features/editor/components/RelationshipPanel.tsx`

- [ ] **Step 1: CSS 파일 생성**

`apps/web/src/features/editor/components/relationship-panel.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const panel = style({
  width: "280px",
  height: "100%",
  background: vars.color.surface,
  borderLeft: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  fontSize: "13px",
  overflow: "hidden",
});

export const panelHeader = style({
  padding: `${vars.space["3"]} 14px`,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
});

export const panelTitle = style({
  fontWeight: "700",
  fontSize: "14px",
  color: vars.color.textPrimary,
  flex: 1,
});

export const closeBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textDisabled,
  fontSize: "16px",
  lineHeight: 1,
  padding: `2px ${vars.space["1"]}`,
  borderRadius: vars.radius.sm,
  selectors: {
    "&:hover": { color: vars.color.textPrimary },
  },
});

export const section = style({
  padding: `10px 14px`,
  borderBottom: `1px solid ${vars.color.surfaceTertiary}`,
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const label = style({
  fontSize: "11px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const toggleRow = style({
  display: "flex",
  gap: vars.space["2"],
});

export const toggleBtn = style({
  flex: 1,
  padding: `6px 0`,
  fontSize: "12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
  fontFamily: vars.font.family,
  transition: "all 150ms ease",
});

export const toggleBtnActive = style({
  background: vars.color.primary,
  color: "#ffffff",
  borderColor: vars.color.primary,
});

export const select = style({
  fontSize: "12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "3px",
  padding: `4px ${vars.space["1"]}`,
  color: vars.color.textSecondary,
  background: vars.color.surfaceTertiary,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary },
  },
});

export const deleteBtn = style({
  margin: "10px 14px",
  padding: `6px 0`,
  background: "none",
  border: `1px solid ${vars.color.error}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  color: vars.color.error,
  fontSize: "13px",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
  selectors: {
    "&:hover": { background: `${vars.color.error}14` },
  },
});
```

- [ ] **Step 2: `RelationshipPanel` 컴포넌트 생성**

`apps/web/src/features/editor/components/RelationshipPanel.tsx`:

```typescript
import type { ChangeEvent } from "react";
import { updateRelationship, removeRelationship } from "@erdify/domain";
import type { RelationshipCardinality, ReferentialAction } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./relationship-panel.css";

export const RelationshipPanel = ({ relationshipId }: { relationshipId: string }) => {
  const document = useEditorStore((s) => s.document);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);

  const rel = document?.relationships.find((r) => r.id === relationshipId);
  if (!rel) return null;

  function onToggleIdentifying(identifying: boolean) {
    applyCommand((doc) => updateRelationship(doc, relationshipId, { identifying }));
  }

  function onCardinality(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { cardinality: e.target.value as RelationshipCardinality })
    );
  }

  function onOnDelete(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { onDelete: e.target.value as ReferentialAction })
    );
  }

  function onOnUpdate(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { onUpdate: e.target.value as ReferentialAction })
    );
  }

  function onDelete() {
    applyCommand((doc) => removeRelationship(doc, relationshipId));
    setSelectedRelationship(null);
  }

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <span className={css.panelTitle}>관계 설정</span>
        <button onClick={() => setSelectedRelationship(null)} className={css.closeBtn}>×</button>
      </div>

      <div className={css.section}>
        <span className={css.label}>관계 유형</span>
        <div className={css.toggleRow}>
          <button
            className={`${css.toggleBtn}${rel.identifying ? ` ${css.toggleBtnActive}` : ""}`}
            onClick={() => onToggleIdentifying(true)}
          >
            식별 관계
          </button>
          <button
            className={`${css.toggleBtn}${!rel.identifying ? ` ${css.toggleBtnActive}` : ""}`}
            onClick={() => onToggleIdentifying(false)}
          >
            비식별 관계
          </button>
        </div>
      </div>

      <div className={css.section}>
        <span className={css.label}>카디널리티</span>
        <select value={rel.cardinality} onChange={onCardinality} className={css.select}>
          <option value="one-to-one">1:1</option>
          <option value="one-to-many">1:N</option>
          <option value="many-to-one">N:1</option>
        </select>
      </div>

      <div className={css.section}>
        <span className={css.label}>ON DELETE</span>
        <select value={rel.onDelete} onChange={onOnDelete} className={css.select}>
          <option value="no-action">NO ACTION</option>
          <option value="cascade">CASCADE</option>
          <option value="restrict">RESTRICT</option>
          <option value="set-null">SET NULL</option>
        </select>
      </div>

      <div className={css.section}>
        <span className={css.label}>ON UPDATE</span>
        <select value={rel.onUpdate} onChange={onOnUpdate} className={css.select}>
          <option value="no-action">NO ACTION</option>
          <option value="cascade">CASCADE</option>
          <option value="restrict">RESTRICT</option>
          <option value="set-null">SET NULL</option>
        </select>
      </div>

      <button onClick={onDelete} className={css.deleteBtn}>관계 삭제</button>
    </div>
  );
};
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/editor/components/RelationshipPanel.tsx apps/web/src/features/editor/components/relationship-panel.css.ts
git commit -m "feat(editor): add RelationshipPanel for identifying/non-identifying toggle"
```

---

## Task 6: `EditorPage`에 `RelationshipPanel` 연결

**Files:**
- Modify: `apps/web/src/features/editor/pages/EditorPage.tsx`

- [ ] **Step 1: import 추가**

```typescript
import { RelationshipPanel } from "../components/RelationshipPanel";
```

그리고 store에서 `selectedRelationshipId` 구독:

```typescript
const { document, isDirty, setDocument, applyCommand, selectedEntityId, selectedRelationshipId } = useEditorStore();
```

- [ ] **Step 2: 패널 렌더링 조건 추가**

`{selectedEntityId && <EntityPanel entityId={selectedEntityId} />}` 바로 아래에 추가:

```tsx
{selectedRelationshipId && <RelationshipPanel relationshipId={selectedRelationshipId} />}
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
pnpm test
```

Expected: 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/editor/pages/EditorPage.tsx
git commit -m "feat(editor): wire RelationshipPanel into EditorPage"
```

---

## Self-Review

**Spec coverage:**
- ✅ `identifying: boolean` 타입 추가 (Task 1)
- ✅ 식별관계(실선) / 비식별관계(점선) 렌더링 (Task 4)
- ✅ 관계선 클릭으로 패널 열기 (Task 4)
- ✅ 패널에서 식별/비식별 토글 (Task 5)
- ✅ cardinality, onDelete, onUpdate 편집 (Task 5 — 기존에 생성 시에만 설정 가능했으나 이제 편집 가능)
- ✅ `updateRelationship` 도메인 커맨드 (Task 2)

**Placeholder scan:** 없음

**Type consistency:**
- `updateRelationship` — Task 2에서 정의, Task 5에서 동일 이름으로 사용 ✅
- `setSelectedRelationship` — Task 3에서 정의, Task 4·5·6에서 동일 이름으로 사용 ✅
- `selectedRelationshipId` — Task 3에서 정의, Task 6에서 동일 이름으로 사용 ✅
- `identifying: boolean` — Task 1에서 추가, Task 4(엣지 스타일), Task 5(패널)에서 접근 ✅

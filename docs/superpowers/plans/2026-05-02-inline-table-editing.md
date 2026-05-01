# Inline Table Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우측 사이드바(EntityPanel, RelationshipPanel)를 제거하고, 테이블 클릭 시 노드 위에서 바로 편집하고 관계선 클릭 시 작은 팝오버로 편집할 수 있게 한다.

**Architecture:** `apps/web`에 `EditableTableNode`(인라인 편집 노드), `CardinalityEdge`(카디널리티 레이블 커스텀 엣지), `RelationshipPopover`(엣지 클릭 팝오버)를 신규 생성한다. `useEditorStore`에 `popoverPos` 상태를 추가하고 노드 타입을 `EditableTableNodeType`으로 교체한다. 기존 `EntityPanel`, `RelationshipPanel` 파일은 삭제한다.

**Tech Stack:** React 19, TypeScript, `@xyflow/react` 12 (`EdgeProps`, `BaseEdge`, `EdgeLabelRenderer`, `getSmoothStepPath`, `MarkerType`), Zustand, vanilla-extract

---

## File Map

| 파일 | 유형 | 역할 |
|------|------|------|
| `apps/web/src/features/editor/stores/useEditorStore.ts` | 수정 | `EditableTableNodeType` 정의, `popoverPos` + `setPopoverPos` 추가, `TableNodeType` 교체 |
| `apps/web/src/features/editor/components/EditableTableNode.tsx` | 신규 | 클릭 시 인라인 편집 노드 (selected = 편집 모드) |
| `apps/web/src/features/editor/components/editable-table-node.css.ts` | 신규 | EditableTableNode 스타일 |
| `apps/web/src/features/editor/components/CardinalityEdge.tsx` | 신규 | 관계선 양 끝에 1/N 레이블이 있는 커스텀 엣지 |
| `apps/web/src/features/editor/components/RelationshipPopover.tsx` | 신규 | 엣지 클릭 위치에 절대 위치로 뜨는 팝오버 |
| `apps/web/src/features/editor/components/relationship-popover.css.ts` | 신규 | RelationshipPopover 스타일 |
| `apps/web/src/features/editor/components/EditorCanvas.tsx` | 수정 | 노드타입 교체, containerRef, 커스텀 엣지, onEdgeClick 좌표, onNodeClick 제거 |
| `apps/web/src/features/editor/pages/EditorPage.tsx` | 수정 | 사이드바 제거, RelationshipPopover 렌더링 |
| `apps/web/src/features/editor/components/EntityPanel.tsx` | 삭제 | — |
| `apps/web/src/features/editor/components/entity-panel.css.ts` | 삭제 | — |
| `apps/web/src/features/editor/components/RelationshipPanel.tsx` | 삭제 | — |
| `apps/web/src/features/editor/components/relationship-panel.css.ts` | 삭제 | — |

---

## Task 1: Store에 `EditableTableNodeType`과 `popoverPos` 추가

**Files:**
- Modify: `apps/web/src/features/editor/stores/useEditorStore.ts`

- [ ] **Step 1: 파일 읽기**

```bash
cat apps/web/src/features/editor/stores/useEditorStore.ts
```

- [ ] **Step 2: 파일 전체 교체**

`apps/web/src/features/editor/stores/useEditorStore.ts`를 아래 내용으로 교체한다:

```typescript
import { create } from "zustand";
import type { Node, NodeChange } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import type { DiagramDocument, DiagramEntity } from "@erdify/domain";

export type EditableTableNodeType = Node<
  { entity: DiagramEntity; collaboratorColor?: string },
  "editableTable"
>;

export interface Collaborator {
  userId: string;
  email: string;
  color: string;
  selectedEntityId: string | null;
}

function docToNodes(doc: DiagramDocument, collaborators: Collaborator[] = []): EditableTableNodeType[] {
  return doc.entities.map((entity) => {
    const collab = collaborators.find((c) => c.selectedEntityId === entity.id);
    return {
      id: entity.id,
      type: "editableTable" as const,
      position: doc.layout.entityPositions[entity.id] ?? { x: 0, y: 0 },
      data: { entity, ...(collab ? { collaboratorColor: collab.color } : {}) },
    };
  });
}

function updateNodes(
  prevDoc: DiagramDocument,
  nextDoc: DiagramDocument,
  prevNodes: EditableTableNodeType[],
  collaborators: Collaborator[]
): EditableTableNodeType[] {
  const prevEntityMap = new Map(prevDoc.entities.map((e) => [e.id, e]));
  const prevNodeMap = new Map(prevNodes.map((n) => [n.id, n]));

  return nextDoc.entities.map((entity) => {
    const prevNode = prevNodeMap.get(entity.id);
    const prevEntity = prevEntityMap.get(entity.id);
    const collab = collaborators.find((c) => c.selectedEntityId === entity.id);
    const collaboratorColor = collab?.color;

    const entitySame = prevEntity === entity;
    const positionSame =
      prevDoc.layout.entityPositions[entity.id] === nextDoc.layout.entityPositions[entity.id];
    const collabSame = prevNode?.data.collaboratorColor === collaboratorColor;

    if (prevNode && entitySame && positionSame && collabSame) {
      return prevNode;
    }

    return {
      id: entity.id,
      type: "editableTable" as const,
      position: nextDoc.layout.entityPositions[entity.id] ?? { x: 0, y: 0 },
      data: { entity, ...(collaboratorColor ? { collaboratorColor } : {}) },
    };
  });
}

interface EditorState {
  document: DiagramDocument | null;
  nodes: EditableTableNodeType[];
  isDirty: boolean;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  popoverPos: { x: number; y: number } | null;
  collaborators: Collaborator[];

  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  applyNodeChanges: (changes: NodeChange<EditableTableNodeType>[]) => void;
  setSelectedEntity: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  setPopoverPos: (pos: { x: number; y: number } | null) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  clearDirty: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  nodes: [],
  isDirty: false,
  selectedEntityId: null,
  selectedRelationshipId: null,
  popoverPos: null,
  collaborators: [],

  setDocument: (doc) =>
    set((state) => ({
      document: doc,
      nodes: docToNodes(doc, state.collaborators),
      isDirty: false,
    })),

  applyCommand: (fn) => {
    const { document, nodes, collaborators } = get();
    if (!document) return;
    const next = fn(document);
    set({ document: next, nodes: updateNodes(document, next, nodes, collaborators), isDirty: true });
  },

  applyNodeChanges: (changes) => {
    const { nodes } = get();
    set({ nodes: applyNodeChanges(changes, nodes) });
  },

  setSelectedEntity: (id) => set({ selectedEntityId: id, selectedRelationshipId: null, popoverPos: null }),

  setSelectedRelationship: (id) => set({ selectedRelationshipId: id, selectedEntityId: null }),

  setPopoverPos: (pos) => set({ popoverPos: pos }),

  setCollaborators: (collaborators) =>
    set((state) => ({
      collaborators,
      nodes: state.document
        ? updateNodes(state.document, state.document, state.nodes, collaborators)
        : state.nodes,
    })),

  clearDirty: () => set({ isDirty: false }),
}));
```

- [ ] **Step 3: 타입 체크**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify && pnpm typecheck
```

Expected: 에러 발생 (아직 `TableNodeType`을 참조하는 파일들이 있음 — 이후 태스크에서 수정)

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/editor/stores/useEditorStore.ts
git commit -m "feat(editor): add EditableTableNodeType and popoverPos to store"
```

---

## Task 2: `EditableTableNode` 컴포넌트 생성

**Files:**
- Create: `apps/web/src/features/editor/components/editable-table-node.css.ts`
- Create: `apps/web/src/features/editor/components/EditableTableNode.tsx`

- [ ] **Step 1: CSS 파일 생성**

`apps/web/src/features/editor/components/editable-table-node.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const nodeView = style({
  background: "#ffffff",
  border: `2px solid ${vars.color.border}`,
  borderRadius: 6,
  minWidth: 180,
  fontFamily: "monospace",
  fontSize: 12,
  boxShadow: vars.shadow.sm,
  position: "relative",
});

export const nodeViewSelected = style({
  border: `2px solid ${vars.color.primary}`,
  boxShadow: `0 4px 20px rgba(0, 100, 224, 0.18)`,
});

export const header = style({
  background: "#374151",
  color: "#ffffff",
  padding: "6px 10px",
  fontWeight: 700,
  borderRadius: "4px 4px 0 0",
  fontSize: 13,
});

export const headerSelected = style({
  background: vars.color.primary,
});

export const headerEditRow = style({
  background: vars.color.primary,
  padding: "5px 8px",
  borderRadius: "4px 4px 0 0",
  display: "flex",
  alignItems: "center",
  gap: 6,
});

export const tableNameInput = style({
  flex: 1,
  background: "rgba(255,255,255,0.15)",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.5)",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 12,
  fontFamily: "monospace",
  outline: "none",
  padding: "1px 2px",
});

export const deleteEntityBtn = style({
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.6)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
  selectors: {
    "&:hover": { color: "#ffffff" },
  },
});

export const columnList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
});

export const columnItem = style({
  padding: "3px 10px",
  borderBottom: "1px solid #f3f4f6",
  display: "flex",
  gap: 8,
  alignItems: "center",
});

export const pkBadge = style({
  color: "#f59e0b",
  fontWeight: 700,
  fontSize: 10,
  minWidth: 16,
});

export const columnName = style({
  flex: 1,
  color: "#111827",
});

export const columnType = style({
  color: "#6b7280",
  fontSize: 10,
});

export const nullableBadge = style({
  color: "#9ca3af",
});

export const emptyHint = style({
  padding: "4px 10px",
  color: "#9ca3af",
  fontStyle: "italic",
});

// 편집 모드 전용
export const editArea = style({
  padding: 0,
});

export const colHeaderRow = style({
  display: "flex",
  gap: 4,
  padding: "2px 8px",
  background: "#f1f5f9",
  borderBottom: "1px solid #e2e8f0",
});

export const colHeaderLabel = style({
  fontSize: 9,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const editColumnItem = style({
  padding: "3px 8px",
  borderBottom: "1px solid #f1f5f9",
  display: "flex",
  gap: 4,
  alignItems: "center",
});

export const editPkBadge = style({
  width: 20,
  color: "#f59e0b",
  fontWeight: 700,
  fontSize: 9,
  textAlign: "center",
});

export const columnNameInput = style({
  flex: 1,
  fontSize: 11,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 2,
  padding: "1px 3px",
  fontFamily: "monospace",
  color: vars.color.textPrimary,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary },
  },
});

export const typeSelect = style({
  width: 82,
  fontSize: 10,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 2,
  padding: "1px 2px",
  color: vars.color.textSecondary,
  background: vars.color.surfaceTertiary,
  fontFamily: "monospace",
  outline: "none",
});

export const pkCheckbox = style({
  width: 14,
  height: 14,
  accentColor: vars.color.primary,
  cursor: "pointer",
});

export const deleteColBtn = style({
  width: 16,
  background: "none",
  border: "none",
  color: vars.color.border,
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
  lineHeight: 1,
  selectors: {
    "&:hover": { color: vars.color.error },
  },
});

export const addColumnBtn = style({
  width: "100%",
  fontSize: 10,
  padding: "3px 0",
  background: vars.color.surfaceTertiary,
  border: `1px dashed ${vars.color.borderStrong}`,
  borderRadius: 3,
  color: vars.color.textSecondary,
  cursor: "pointer",
  fontFamily: "monospace",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const addColumnWrapper = style({
  padding: "4px 8px",
});

export const collaboratorDot = style({
  position: "absolute",
  top: -8,
  right: 6,
  width: 12,
  height: 12,
  borderRadius: "50%",
  border: "2px solid #ffffff",
  zIndex: 1,
});
```

- [ ] **Step 2: `EditableTableNode` 컴포넌트 생성**

`apps/web/src/features/editor/components/EditableTableNode.tsx`:

```typescript
import type { ChangeEvent } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  addColumn,
  removeColumn,
  removeEntity,
  renameEntity,
  updateColumn,
} from "@erdify/domain";
import type { DiagramColumn } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType } from "../stores/useEditorStore";
import * as css from "./editable-table-node.css";

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

export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  const { entity, collaboratorColor } = data;
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);

  const borderColor = collaboratorColor ?? (selected ? "var(--color-primary, #0064E0)" : "#d1d5db");
  const boxShadow = collaboratorColor
    ? `0 0 0 3px ${collaboratorColor}40`
    : selected
    ? "0 4px 20px rgba(0, 100, 224, 0.18)"
    : "0 1px 4px rgba(0,0,0,0.1)";

  if (!selected) {
    // 뷰 모드
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
          <div
            className={css.collaboratorDot}
            style={{ background: collaboratorColor }}
          />
        )}

        <div
          style={{
            background: collaboratorColor ?? (selected ? "#0064E0" : "#374151"),
            color: "#ffffff",
            padding: "6px 10px",
            fontWeight: 700,
            borderRadius: "4px 4px 0 0",
            fontSize: 13,
          }}
        >
          {entity.name}
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {entity.columns.map((col) => (
            <li
              key={col.id}
              style={{
                padding: "3px 10px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              {col.primaryKey && (
                <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 10 }}>PK</span>
              )}
              <span style={{ flex: 1, color: "#111827" }}>{col.name}</span>
              <span style={{ color: "#6b7280", fontSize: 10 }}>{col.type}</span>
              {col.nullable && <span style={{ color: "#9ca3af" }}>?</span>}
            </li>
          ))}
          {entity.columns.length === 0 && (
            <li style={{ padding: "4px 10px", color: "#9ca3af", fontStyle: "italic" }}>
              컬럼 없음
            </li>
          )}
        </ul>

        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  // 편집 모드 (selected = true)
  return (
    <div
      style={{
        background: "#ffffff",
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        minWidth: 220,
        fontFamily: "monospace",
        fontSize: 12,
        boxShadow,
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} />

      {/* 헤더: 테이블명 편집 */}
      <div className={css.headerEditRow}>
        <input
          className={css.tableNameInput}
          value={entity.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => renameEntity(doc, entity.id, e.target.value))
          }
        />
        <button
          className={css.deleteEntityBtn}
          onClick={() => {
            applyCommand((doc) => removeEntity(doc, entity.id));
            setSelectedEntity(null);
          }}
          title="테이블 삭제"
        >
          🗑
        </button>
      </div>

      {/* 컬럼 목록 — nodrag로 드래그 방지 */}
      <div className="nodrag">
        {/* 컬럼 헤더 레이블 */}
        <div className={css.colHeaderRow}>
          <span style={{ width: 20 }} />
          <span style={{ flex: 1 }} className={css.colHeaderLabel}>컬럼명</span>
          <span style={{ width: 82 }} className={css.colHeaderLabel}>타입</span>
          <span style={{ width: 14, textAlign: "center" }} className={css.colHeaderLabel}>PK</span>
          <span style={{ width: 16 }} />
        </div>

        {entity.columns.map((col) => (
          <div key={col.id} className={css.editColumnItem}>
            <span className={css.editPkBadge}>{col.primaryKey ? "PK" : ""}</span>
            <input
              className={css.columnNameInput}
              value={col.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { name: e.target.value }))
              }
            />
            <select
              className={css.typeSelect}
              value={col.type}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { type: e.target.value }))
              }
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              {!COLUMN_TYPES.includes(col.type) && (
                <option value={col.type}>{col.type}</option>
              )}
            </select>
            <input
              type="checkbox"
              className={css.pkCheckbox}
              checked={col.primaryKey}
              onChange={(e) =>
                applyCommand((doc) =>
                  updateColumn(doc, entity.id, col.id, { primaryKey: e.target.checked })
                )
              }
            />
            <button
              className={css.deleteColBtn}
              onClick={() => applyCommand((doc) => removeColumn(doc, entity.id, col.id))}
            >
              ×
            </button>
          </div>
        ))}

        <div className={css.addColumnWrapper}>
          <button
            className={css.addColumnBtn}
            onClick={() =>
              applyCommand((doc) =>
                addColumn(doc, entity.id, makeColumn(entity.columns.length))
              )
            }
          >
            + 컬럼 추가
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
};
```

- [ ] **Step 3: 타입 체크**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify && pnpm typecheck
```

Expected: 아직 `TableNodeType` 참조 에러가 남아 있을 수 있음 (이후 태스크에서 해결)

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/editor/components/EditableTableNode.tsx \
        apps/web/src/features/editor/components/editable-table-node.css.ts
git commit -m "feat(editor): add EditableTableNode with inline edit mode"
```

---

## Task 3: `CardinalityEdge` 커스텀 엣지 생성

**Files:**
- Create: `apps/web/src/features/editor/components/CardinalityEdge.tsx`

- [ ] **Step 1: `CardinalityEdge` 생성**

`apps/web/src/features/editor/components/CardinalityEdge.tsx`:

```typescript
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { RelationshipCardinality } from "@erdify/domain";

type CardinalityEdgeData = {
  cardinality: RelationshipCardinality;
  identifying: boolean;
};

function getLabels(cardinality: RelationshipCardinality): { source: string; target: string } {
  switch (cardinality) {
    case "one-to-one":   return { source: "1", target: "1" };
    case "one-to-many":  return { source: "1", target: "N" };
    case "many-to-one":  return { source: "N", target: "1" };
  }
}

export const CardinalityEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps & { data: CardinalityEdgeData }) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { source: sourceLabel, target: targetLabel } = getLabels(data.cardinality);

  const edgeStyle = {
    stroke: "#6366f1",
    strokeWidth: 1.5,
    ...(!data.identifying ? { strokeDasharray: "6 3" } : {}),
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "monospace",
    color: "#6366f1",
    background: "#ffffff",
    padding: "1px 3px",
    borderRadius: 3,
    pointerEvents: "none",
    lineHeight: 1,
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {/* source 쪽 레이블 */}
        <div
          className="nodrag nopan"
          style={{
            ...labelStyle,
            transform: `translate(${sourceX + 8}px, ${sourceY - 16}px)`,
          }}
        >
          {sourceLabel}
        </div>
        {/* target 쪽 레이블 */}
        <div
          className="nodrag nopan"
          style={{
            ...labelStyle,
            transform: `translate(${targetX - 20}px, ${targetY - 16}px)`,
          }}
        >
          {targetLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify && pnpm --filter @erdify/web typecheck 2>/dev/null || pnpm typecheck
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/features/editor/components/CardinalityEdge.tsx
git commit -m "feat(editor): add CardinalityEdge with 1/N labels"
```

---

## Task 4: `RelationshipPopover` 생성

**Files:**
- Create: `apps/web/src/features/editor/components/relationship-popover.css.ts`
- Create: `apps/web/src/features/editor/components/RelationshipPopover.tsx`

- [ ] **Step 1: CSS 파일 생성**

`apps/web/src/features/editor/components/relationship-popover.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const popover = style({
  position: "absolute",
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: "10px 12px",
  boxShadow: vars.shadow.lg,
  width: 186,
  zIndex: 1000,
  fontSize: 11,
});

export const arrow = style({
  position: "absolute",
  top: -5,
  left: "50%",
  width: 8,
  height: 8,
  background: vars.color.surface,
  borderLeft: `1px solid ${vars.color.border}`,
  borderTop: `1px solid ${vars.color.border}`,
  transform: "translateX(-50%) rotate(45deg)",
});

export const sectionLabel = style({
  fontSize: 10,
  fontWeight: 600,
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: vars.space["1"],
});

export const section = style({
  marginBottom: vars.space["2"],
});

export const toggleRow = style({
  display: "flex",
  gap: vars.space["1"],
});

export const toggleBtn = style({
  flex: 1,
  fontSize: 11,
  padding: `4px 0`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
  fontFamily: vars.font.family,
  transition: "all 120ms ease",
});

export const toggleBtnActive = style({
  background: vars.color.primary,
  color: "#ffffff",
  borderColor: vars.color.primary,
});

export const select = style({
  width: "100%",
  fontSize: 11,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 3,
  padding: `3px ${vars.space["1"]}`,
  color: vars.color.textSecondary,
  background: vars.color.surfaceTertiary,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary },
  },
});

export const deleteBtn = style({
  width: "100%",
  padding: `5px 0`,
  background: "none",
  border: `1px solid ${vars.color.error}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  color: vars.color.error,
  fontSize: 11,
  fontFamily: vars.font.family,
  marginTop: vars.space["1"],
  transition: "background 120ms ease",
  selectors: {
    "&:hover": { background: `${vars.color.error}14` },
  },
});
```

- [ ] **Step 2: `RelationshipPopover` 생성**

`apps/web/src/features/editor/components/RelationshipPopover.tsx`:

```typescript
import type { ChangeEvent } from "react";
import { updateRelationship, removeRelationship } from "@erdify/domain";
import type { RelationshipCardinality, ReferentialAction } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./relationship-popover.css";

type Props = {
  relationshipId: string;
  pos: { x: number; y: number };
};

export const RelationshipPopover = ({ relationshipId, pos }: Props) => {
  const document = useEditorStore((s) => s.document);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);
  const setPopoverPos = useEditorStore((s) => s.setPopoverPos);

  const rel = document?.relationships.find((r) => r.id === relationshipId);
  if (!rel) return null;

  function close() {
    setSelectedRelationship(null);
    setPopoverPos(null);
  }

  function onToggleIdentifying(identifying: boolean) {
    applyCommand((doc) => updateRelationship(doc, relationshipId, { identifying }));
  }

  function onCardinality(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { cardinality: e.target.value as RelationshipCardinality })
    );
  }

  function onDeleteChange(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { onDelete: e.target.value as ReferentialAction })
    );
  }

  function onUpdateChange(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { onUpdate: e.target.value as ReferentialAction })
    );
  }

  function onDelete() {
    applyCommand((doc) => removeRelationship(doc, relationshipId));
    close();
  }

  return (
    <div
      className={`${css.popover} nodrag nopan`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className={css.arrow} />

      <div className={css.section}>
        <div className={css.sectionLabel}>관계 유형</div>
        <div className={css.toggleRow}>
          <button
            className={`${css.toggleBtn}${rel.identifying ? ` ${css.toggleBtnActive}` : ""}`}
            onClick={() => onToggleIdentifying(true)}
          >
            식별
          </button>
          <button
            className={`${css.toggleBtn}${!rel.identifying ? ` ${css.toggleBtnActive}` : ""}`}
            onClick={() => onToggleIdentifying(false)}
          >
            비식별
          </button>
        </div>
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>카디널리티</div>
        <select value={rel.cardinality} onChange={onCardinality} className={css.select}>
          <option value="one-to-one">1:1</option>
          <option value="one-to-many">1:N</option>
          <option value="many-to-one">N:1</option>
        </select>
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>ON DELETE</div>
        <select value={rel.onDelete} onChange={onDeleteChange} className={css.select}>
          <option value="no-action">NO ACTION</option>
          <option value="cascade">CASCADE</option>
          <option value="restrict">RESTRICT</option>
          <option value="set-null">SET NULL</option>
        </select>
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>ON UPDATE</div>
        <select value={rel.onUpdate} onChange={onUpdateChange} className={css.select}>
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
cd /Users/junhoson/Documents/GitHub/ERDify && pnpm typecheck
```

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/editor/components/RelationshipPopover.tsx \
        apps/web/src/features/editor/components/relationship-popover.css.ts
git commit -m "feat(editor): add RelationshipPopover floating panel"
```

---

## Task 5: `EditorCanvas` 업데이트

**Files:**
- Modify: `apps/web/src/features/editor/components/EditorCanvas.tsx`

- [ ] **Step 1: 파일 전체 교체**

`apps/web/src/features/editor/components/EditorCanvas.tsx`를 아래로 교체:

```typescript
import { useRef } from "react";
import type { MouseEvent } from "react";
import { ReactFlow, Background, Controls, MarkerType } from "@xyflow/react";
import type { Edge, EdgeChange, NodeChange, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { updateEntityPosition, addRelationship, removeRelationship } from "@erdify/domain";
import type { DiagramRelationship } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType } from "../stores/useEditorStore";
import { EditableTableNode } from "./EditableTableNode";
import { CardinalityEdge } from "./CardinalityEdge";

const nodeTypes = { editableTable: EditableTableNode };
const edgeTypes = { cardinality: CardinalityEdge };

const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "#6366f1",
  width: 16,
  height: 16,
} as const;

export const EditorCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const document = useEditorStore((s) => s.document);
  const nodes = useEditorStore((s) => s.nodes);
  const applyNodeChanges = useEditorStore((s) => s.applyNodeChanges);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);
  const setPopoverPos = useEditorStore((s) => s.setPopoverPos);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);

  if (!document) return null;

  const edges: Edge[] = document.relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceEntityId,
    target: rel.targetEntityId,
    type: "cardinality",
    markerEnd: EDGE_MARKER,
    data: { cardinality: rel.cardinality, identifying: rel.identifying },
  }));

  function onNodesChange(changes: NodeChange<EditableTableNodeType>[]) {
    applyNodeChanges(changes);
  }

  function onNodeDragStop(_: MouseEvent, node: EditableTableNodeType) {
    applyCommand((doc) => updateEntityPosition(doc, node.id, node.position));
  }

  function onPaneClick() {
    setSelectedEntity(null);
    setSelectedRelationship(null);
    setPopoverPos(null);
  }

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    if (!document) return;

    const sourceEntity = document.entities.find((e) => e.id === connection.source);
    const targetEntity = document.entities.find((e) => e.id === connection.target);
    if (!sourceEntity || !targetEntity) return;

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

    applyCommand((doc) => addRelationship(doc, relationship));
  }

  function onEdgeClick(event: MouseEvent, edge: Edge) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setPopoverPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top + 12,
      });
    }
    setSelectedRelationship(edge.id);
  }

  function onEdgesChange(changes: EdgeChange[]) {
    const removes = changes.filter((c): c is EdgeChange & { type: "remove" } => c.type === "remove");
    if (removes.length === 0) return;
    applyCommand((doc) =>
      removes.reduce((d, change) => removeRelationship(d, change.id), doc)
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        deleteKeyCode="Delete"
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify && pnpm typecheck
```

Expected: 에러 수 감소 (EditorPage 아직 수정 전)

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/features/editor/components/EditorCanvas.tsx
git commit -m "feat(editor): use EditableTableNode and CardinalityEdge in canvas"
```

---

## Task 6: `EditorPage` 업데이트 및 구 파일 삭제

**Files:**
- Modify: `apps/web/src/features/editor/pages/EditorPage.tsx`
- Delete: `apps/web/src/features/editor/components/EntityPanel.tsx`
- Delete: `apps/web/src/features/editor/components/entity-panel.css.ts`
- Delete: `apps/web/src/features/editor/components/RelationshipPanel.tsx`
- Delete: `apps/web/src/features/editor/components/relationship-panel.css.ts`

- [ ] **Step 1: `EditorPage.tsx` 전체 교체**

`apps/web/src/features/editor/pages/EditorPage.tsx`:

```typescript
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addEntity } from "@erdify/domain";
import { getDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../stores/useEditorStore";
import { EditorCanvas } from "../components/EditorCanvas";
import { RelationshipPopover } from "../components/RelationshipPopover";
import { VersionHistoryDrawer } from "../components/VersionHistoryDrawer";
import { InviteModal } from "../components/InviteModal";
import { PresenceIndicator } from "../components/PresenceIndicator";
import { ExportDdlModal } from "../components/ExportDdlModal";
import { useDiagramAutosave } from "../hooks/useDiagramAutosave";
import { useVersionHistory } from "../hooks/useVersionHistory";
import { useRealtimeCollaboration } from "../hooks/useRealtimeCollaboration";
import * as css from "./editor-page.css";

export const EditorPage = () => {
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const { document, isDirty, setDocument, applyCommand, selectedRelationshipId, popoverPos } =
    useEditorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["diagram", diagramId],
    queryFn: () => getDiagram(diagramId!),
    enabled: !!diagramId,
  });

  useEffect(() => {
    if (data) setDocument(data.content);
  // data.id가 바뀔 때(다른 다이어그램으로 이동)만 재초기화, 백그라운드 refetch는 무시
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  useRealtimeCollaboration(diagramId ?? "");
  useDiagramAutosave(diagramId ?? "");
  const { saveVersion, isSavingVersion } = useVersionHistory(diagramId ?? "");

  function handleAddTable() {
    applyCommand((doc) =>
      addEntity(doc, {
        id: crypto.randomUUID(),
        name: `Table_${doc.entities.length + 1}`,
      })
    );
  }

  if (isLoading) {
    return <div className={css.loadingContainer}>Loading...</div>;
  }

  return (
    <div className={css.root}>
      <div className={css.topbar}>
        <button
          onClick={() => navigate(-1)}
          className={css.backBtn}
          title="뒤로가기"
        >
          ←
        </button>
        <span className={css.diagramName}>{data?.name}</span>
        <span className={css.statusText}>{isDirty ? "수정됨" : "저장됨"}</span>
        <div className={css.spacer} />
        <PresenceIndicator />
        <button
          onClick={() => setShowExport(true)}
          className={css.topbarBtn({ variant: "secondary" })}
        >
          DDL 내보내기
        </button>
        <button
          onClick={() => setShowInvite(true)}
          className={css.topbarBtn({ variant: "secondary" })}
        >
          + 멤버 초대
        </button>
        <button
          onClick={handleAddTable}
          className={css.topbarBtn({ variant: "dark" })}
        >
          + 테이블
        </button>
        <button
          onClick={() => saveVersion()}
          disabled={isSavingVersion}
          className={css.topbarBtn({ variant: "success" })}
        >
          버전 저장
        </button>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={css.topbarBtn({ variant: showHistory ? "historyActive" : "historyInactive" })}
        >
          기록
        </button>
      </div>

      <div className={css.content}>
        <div className={css.canvasArea}>
          <EditorCanvas />
          {selectedRelationshipId && popoverPos && (
            <RelationshipPopover
              relationshipId={selectedRelationshipId}
              pos={popoverPos}
            />
          )}
        </div>
        {showHistory && diagramId && (
          <VersionHistoryDrawer diagramId={diagramId} onClose={() => setShowHistory(false)} />
        )}
      </div>

      {showInvite && data?.organizationId && (
        <InviteModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          organizationId={data.organizationId}
        />
      )}

      <ExportDdlModal
        open={showExport}
        diagramName={data?.name ?? "diagram"}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
};
```

- [ ] **Step 2: 구 파일 삭제**

```bash
rm apps/web/src/features/editor/components/EntityPanel.tsx
rm apps/web/src/features/editor/components/entity-panel.css.ts
rm apps/web/src/features/editor/components/RelationshipPanel.tsx
rm apps/web/src/features/editor/components/relationship-panel.css.ts
```

- [ ] **Step 3: 타입 체크 전체 통과**

```bash
cd /Users/junhoson/Documents/GitHub/ERDify && pnpm typecheck
```

Expected: 7/7 PASS, 0 errors

- [ ] **Step 4: 도메인 테스트 통과**

```bash
pnpm --filter @erdify/domain test
```

Expected: 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/editor/pages/EditorPage.tsx
git rm apps/web/src/features/editor/components/EntityPanel.tsx \
       apps/web/src/features/editor/components/entity-panel.css.ts \
       apps/web/src/features/editor/components/RelationshipPanel.tsx \
       apps/web/src/features/editor/components/relationship-panel.css.ts
git commit -m "feat(editor): replace sidebar panels with inline editing and popover"
```

---

## Self-Review

**Spec coverage:**
- ✅ 테이블 클릭 → 인라인 편집 모드 (`EditableTableNode`, Task 2)
- ✅ `nodrag` 클래스로 편집 영역 드래그 방지 (Task 2)
- ✅ 관계선 클릭 → 팝오버 (`RelationshipPopover`, Task 4)
- ✅ 팝오버 좌표 `popoverPos` store에 저장 (Task 1, 5)
- ✅ 카디널리티 레이블 (`CardinalityEdge`, Task 3)
- ✅ 식별/비식별 실선/점선 (`CardinalityEdge`, Task 3)
- ✅ `EntityPanel`, `RelationshipPanel` 삭제 (Task 6)
- ✅ 바깥 클릭 시 팝오버 닫힘 (`onPaneClick`, Task 5)
- ✅ 협업자 색상 표시 유지 (Task 2)

**Placeholder scan:** 없음

**Type consistency:**
- `EditableTableNodeType` — Task 1에서 정의, Task 2·5에서 동일 이름으로 사용 ✅
- `popoverPos` / `setPopoverPos` — Task 1에서 정의, Task 4·5·6에서 동일 이름으로 사용 ✅
- `CardinalityEdgeData.cardinality`, `CardinalityEdgeData.identifying` — Task 3·5 일치 ✅
- `RelationshipPopover` props: `{ relationshipId, pos }` — Task 4·6 일치 ✅

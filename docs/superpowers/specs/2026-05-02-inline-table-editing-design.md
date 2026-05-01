# 인라인 테이블 편집 설계

## 목표

ERD 편집 화면에서 우측 사이드바(EntityPanel, RelationshipPanel)를 제거하고, 테이블과 관계선을 캔버스 위에서 직접 편집할 수 있게 한다. 시선이 캔버스 밖으로 이탈하지 않아 편집 흐름이 끊기지 않는다.

## 배경

현재 구조:
- 테이블 클릭 → 우측 280px 사이드바(`EntityPanel`) 오픈
- 관계선 클릭 → 우측 280px 사이드바(`RelationshipPanel`) 오픈
- 편집 중에 시선이 캔버스와 사이드바 사이를 오가야 함

원하는 구조:
- 테이블 클릭 → 노드 자체가 편집 모드로 전환 (인라인)
- 관계선 클릭 → 선 위에 작은 팝오버 오픈
- 사이드바 완전 제거

## 설계 결정

### 접근법: `EditableTableNode` (apps/web 신규 컴포넌트)

`packages/erd-ui/TableNode`는 순수 표시 컴포넌트로 유지하고, `apps/web`에 `EditableTableNode`를 새로 만든다. 이 컴포넌트는 `useEditorStore`를 직접 구독해 콜백 prop 없이 편집 로직을 처리한다.

이유:
- `erd-ui` 패키지에 앱 의존성 주입 불필요
- 편집 로직이 한 곳에 집중됨
- 기존 `TableNode` 표시 로직과 독립적으로 수정 가능

---

## 컴포넌트 설계

### 1. `EditableTableNode`

**파일:** `apps/web/src/features/editor/components/EditableTableNode.tsx`
**CSS:** `apps/web/src/features/editor/components/editable-table-node.css.ts`

React Flow 노드 컴포넌트. `selected` prop이 `true`일 때 편집 모드, `false`일 때 뷰 모드.

**뷰 모드 (selected = false):**
- 현재 `TableNode`와 동일한 시각 표현
- 테이블명(헤더), 컬럼 목록(PK 배지, 이름, 타입, nullable 표시)
- `collaboratorColor` 지원 유지

**편집 모드 (selected = true):**
- 헤더: 테이블명 `<input>` + 삭제 버튼(🗑)
- 컬럼 헤더 레이블 행 (컬럼명 / 타입 / PK — 작은 레이블)
- 컬럼 행마다:
  - PK 배지 (PK인 경우만 표시)
  - 컬럼명 `<input>`
  - 타입 `<select>` (기존 COLUMN_TYPES 목록)
  - PK `<input type="checkbox">`
  - 삭제 `<button>`
- 하단: `+ 컬럼 추가` 버튼

**store 구독:**
- `applyCommand` — 모든 변경은 도메인 커맨드로 처리
- `entity` — `data.entity`로 직접 접근 (store 구독 불필요)

**데이터 흐름:**
```
사용자 입력
  → EditableTableNode 내 이벤트 핸들러
  → applyCommand(doc => renameEntity / addColumn / updateColumn / removeColumn / removeEntity)
  → Zustand store 업데이트
  → React Flow 노드 리렌더
```

**Handle(연결점):** 뷰/편집 모드 모두 Left(target) + Right(source) Handle 유지

**React Flow 드래그 충돌 방지:**
- 편집 모드일 때 컬럼 목록 컨테이너에 `className="nodrag"` 적용. React Flow는 `nodrag` 클래스가 있는 요소에서 시작된 마우스다운 이벤트를 드래그로 처리하지 않는다.

---

### 2. `RelationshipPopover`

**파일:** `apps/web/src/features/editor/components/RelationshipPopover.tsx`
**CSS:** `apps/web/src/features/editor/components/relationship-popover.css.ts`

엣지 클릭 시 클릭 좌표 기준으로 캔버스 컨테이너 위에 절대 위치로 렌더링되는 팝오버.

**표시 조건:** `selectedRelationshipId !== null && popoverPos !== null`

**위치 계산:**
- `onEdgeClick(event, edge)` 에서 `event.clientX`, `event.clientY` 획득
- 캔버스 컨테이너의 `getBoundingClientRect()`로 상대 좌표 계산
- `left = clientX - rect.left`, `top = clientY - rect.top + 12` (선 아래 12px)
- 화면 경계 넘침 방지: `right` 방향으로 넘치면 왼쪽으로 오프셋

**내용 (현재 RelationshipPanel과 동일):**
- 제목: "관계 설정" + × 닫기
- 식별/비식별 토글 버튼
- 카디널리티 select (1:1 / 1:N / N:1)
- ON DELETE select
- ON UPDATE select
- 관계 삭제 버튼

**바깥 클릭 닫힘:** `EditorCanvas`의 `onPaneClick`에서 `setSelectedRelationship(null)` (기존 동작 유지)

---

### 3. Store 변경

**파일:** `apps/web/src/features/editor/stores/useEditorStore.ts`

추가:
```typescript
popoverPos: { x: number; y: number } | null;
setPopoverPos: (pos: { x: number; y: number } | null) => void;
```

`setSelectedRelationship` 수정:
```typescript
setSelectedRelationship: (id) => set({
  selectedRelationshipId: id,
  selectedEntityId: null,
  popoverPos: id === null ? null : get().popoverPos,
})
```

---

### 4. `EditorCanvas` 변경

**파일:** `apps/web/src/features/editor/components/EditorCanvas.tsx`

- `nodeTypes`에 `editableTable: EditableTableNode` 등록 (기존 `table: TableNode` 교체)
- `useEditorStore`에서 노드 생성 시 `type: "editableTable"` 사용
- `EditorCanvas` 내부에서 `ReactFlow` 컴포넌트를 감싸는 `<div ref={containerRef}>` 추가
- `onEdgeClick(event, edge)`:
  ```typescript
  function onEdgeClick(event: React.MouseEvent, edge: Edge) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setPopoverPos({ x: event.clientX - rect.left, y: event.clientY - rect.top + 12 });
    }
    setSelectedRelationship(edge.id);
  }
  ```
- `onNodeClick` 제거 (React Flow 기본 selected 동작으로 충분)
- `setSelectedEntity` 호출 제거 (node click 핸들러 불필요)

---

### 5. `EditorPage` 변경

**파일:** `apps/web/src/features/editor/pages/EditorPage.tsx`

제거:
```tsx
{selectedEntityId && <EntityPanel entityId={selectedEntityId} />}
{selectedRelationshipId && <RelationshipPanel relationshipId={selectedRelationshipId} />}
```

추가:
```tsx
<div className={css.canvasArea} style={{ position: "relative" }}>
  <EditorCanvas />
  {selectedRelationshipId && popoverPos && (
    <RelationshipPopover
      relationshipId={selectedRelationshipId}
      pos={popoverPos}
    />
  )}
</div>
```

`useEditorStore`에서 `popoverPos` 추가 구독. `RelationshipPopover`는 `position: absolute`로 `.canvasArea` 기준 좌표 사용. `.canvasArea`는 `position: relative` 유지 (EditorPage CSS에서).

---

## 제거되는 파일

- `apps/web/src/features/editor/components/EntityPanel.tsx`
- `apps/web/src/features/editor/components/entity-panel.css.ts`
- `apps/web/src/features/editor/components/RelationshipPanel.tsx`
- `apps/web/src/features/editor/components/relationship-panel.css.ts`

---

## 파일 맵

| 파일 | 유형 | 역할 |
|------|------|------|
| `EditableTableNode.tsx` | 신규 | 뷰/편집 모드 통합 테이블 노드 |
| `editable-table-node.css.ts` | 신규 | EditableTableNode 스타일 |
| `RelationshipPopover.tsx` | 신규 | 엣지 클릭 팝오버 |
| `relationship-popover.css.ts` | 신규 | RelationshipPopover 스타일 |
| `useEditorStore.ts` | 수정 | popoverPos 상태 추가 |
| `EditorCanvas.tsx` | 수정 | 노드타입 교체, canvasRef, onEdgeClick 좌표 |
| `EditorPage.tsx` | 수정 | 사이드바 제거, 팝오버 렌더링 |
| `useEditorStore.ts` (nodes) | 수정 | 노드 type을 "editableTable"로 변경 |
| `EntityPanel.tsx` | 삭제 | — |
| `entity-panel.css.ts` | 삭제 | — |
| `RelationshipPanel.tsx` | 삭제 | — |
| `relationship-panel.css.ts` | 삭제 | — |

---

---

## 엣지 카디널리티 레이블 표시

관계선 양 끝에 카디널리티 기호를 텍스트로 표시한다.

**표시 방식:**

| cardinality 값 | source 쪽 레이블 | target 쪽 레이블 |
|---------------|-----------------|-----------------|
| `one-to-one`  | `1`             | `1`             |
| `one-to-many` | `1`             | `N`             |
| `many-to-one` | `N`             | `1`             |

**구현:**

React Flow의 `edge` 객체에 `markerStart`/`markerEnd` 대신, `labelStyle`로 처리하기 어려우므로 React Flow의 `label` 기능 대신 **SVG edge label 두 개**를 활용한다.

`EditorCanvas.tsx`의 `edges` 매핑에서 각 엣지에 `data: { cardinality: rel.cardinality }`를 추가하고, React Flow의 커스텀 엣지 타입(`CardinalityEdge`)을 등록한다.

**`CardinalityEdge` 컴포넌트** (`apps/web/src/features/editor/components/CardinalityEdge.tsx`):
- `BaseEdge` + `EdgeLabelRenderer`를 사용
- source 쪽 끝 (10% 지점)에 카디널리티 시작 레이블
- target 쪽 끝 (90% 지점)에 카디널리티 끝 레이블
- `getEdgeCenter` 또는 `getStraightPath` / `getSmoothStepPath`로 경로 계산 후 레이블 위치 결정
- 식별 관계: 실선 + 레이블, 비식별 관계: 점선 + 레이블
- 레이블 스타일: 작은 폰트(10px), 회색 배경, 테두리 없음

**레이블 위치:**
- React Flow의 `EdgeLabelRenderer`로 HTML 레이블을 SVG 위에 포지셔닝
- source-end 레이블: 경로의 15% 지점 좌표
- target-end 레이블: 경로의 85% 지점 좌표

**파일 추가:**
- `apps/web/src/features/editor/components/CardinalityEdge.tsx` (신규)

**파일 맵 업데이트:**

| 파일 | 유형 | 역할 |
|------|------|------|
| `CardinalityEdge.tsx` | 신규 | 카디널리티 레이블이 있는 커스텀 엣지 |

---

## 테스트 기준

- 테이블 클릭 시 인라인 편집 모드로 전환되고 컬럼 input에 포커스 가능
- 편집 중 다른 곳 클릭 시 뷰 모드로 복귀
- 컬럼 추가/삭제/이름 변경/타입 변경/PK 토글 동작
- 테이블 삭제 동작
- 관계선 클릭 시 팝오버가 클릭 위치 근처에 표시됨
- 팝오버에서 식별/비식별, 카디널리티, 관계 삭제 동작
- 캔버스 빈 곳 클릭 시 팝오버 닫힘
- 드래그로 테이블 이동 시 편집 모드와 충돌 없음
- 협업자 색상 표시 유지
- 관계선 양 끝에 카디널리티 레이블(1/N) 표시
- 카디널리티 변경 시 레이블 즉시 업데이트

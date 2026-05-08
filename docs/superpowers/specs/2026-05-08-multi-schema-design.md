# Multi-Schema ERD Support

**Date:** 2026-05-08  
**Status:** Approved for implementation

## Problem

법무시스템처럼 하나의 DB 안에 Common, Legal, Interface, History, Message 등 여러 스키마가 존재할 때, 현재 ERDify는 스키마 개념이 없어 `Legal.Contract → Common.CustomerCompany` 같은 크로스 스키마 FK를 표현할 수 없다.

---

## Decisions

| 항목 | 결정 |
|------|------|
| 다이어그램 범위 | 하나의 DB 전체 |
| 데이터 모델 | `DiagramEntity`에 `schema: string \| null` 추가 |
| 스키마 표시 | 좌측 컬러 테두리 (배지 없음) |
| 필터 사이드바 | 접기/펴기 (collapsed = 40px 아이콘 스트립) |
| 필터 off 동작 | 테이블 흐리게 + FK 선 유지 |
| 스키마 지정 | 테이블 헤더 드롭다운 |
| 자동정렬 | 스키마 그룹 먼저 → 내부 FK 순 |

---

## Data Model Changes

### `DiagramEntity` (packages/domain/src/types/diagram.type.ts)

```typescript
export interface DiagramEntity {
  id: string;
  schema: string | null;   // ← 추가. null = 스키마 없음
  name: string;
  logicalName: string | null;
  comment: string | null;
  color: string | null;
  columns: DiagramColumn[];
}
```

### Format version bump

`DiagramDocument.format`을 `"erdify.schema.v1"` → `"erdify.schema.v2"`로 변경.  
import 시 v1 문서는 모든 entity에 `schema: null`을 채워 migrate.

---

## UI Components

### 1. Schema Filter Sidebar

에디터 좌측에 새 패널 추가.

**Expanded (196px):**
- 스키마 목록 (색상 점 + 이름 + 테이블 수)
- 체크박스로 개별 on/off
- 하단: 새 스키마 추가 input
- 우상단 `◀` 버튼으로 접기

**Collapsed (40px):**
- 스키마별 컬러 점만 세로 나열
- `▶` 버튼으로 펼치기
- 점에 hover 시 스키마명 tooltip

### 2. Table Node — Schema Color Border

`EditableTableNode`에 좌측 테두리 3px 추가.  
스키마별 색상은 추가 순서 기반 고정 팔레트 (사용자 커스텀 없음):

```
index 0 → #3b82f6 (blue)
index 1 → #8b5cf6 (purple)
index 2 → #10b981 (green)
index 3 → #f59e0b (amber)
index 4 → #ef4444 (red)
index 5 → #ec4899 (pink)
index 6 → #06b6d4 (cyan)
index 7 → #84cc16 (lime)
index 8 → #f97316 (orange)
index 9 → #6b7280 (gray)
10개 초과 시 순환
```

배지(badge)는 표시하지 않음. 색상 테두리만.

### 3. Schema Selector in Table Header

테이블 헤더 우측에 소형 드롭다운:
- 현재 스키마 색상 점 + 이름 + ▾ 표시
- 클릭 시 스키마 목록 팝오버 (다이어그램에 존재하는 스키마 + "새 스키마 추가")
- 스키마 없음 상태일 때는 회색 "스키마 선택 ▾" 표시

### 4. Filter Behavior — Dim

체크박스 off 시:
- 해당 스키마 테이블 노드: `opacity: 0.2`, `pointer-events: none`
- FK edge: 유지 (선은 흐리게 `opacity: 0.3`)
- 필터 off 상태에서도 테이블 존재 위치는 유지 (완전 hide 아님)

### 5. Schema Zone Background (Group View)

툴바의 "그룹 보기" 토글 on 시:
- 같은 스키마 테이블들을 감싸는 반투명 배경 + 점선 테두리 + 스키마명 레이블 렌더링
- ReactFlow `Background`보다 낮은 z-index로 캔버스에 직접 렌더
- 테이블 위치 변경 시마다 zone 범위 재계산 (드래그, 자동정렬 모두 포함)

---

## Auto-Layout Changes

`computeAutoLayout` (EditorCanvas.tsx) 수정:

**현재:** FK 연결 기반 connected-component → 클러스터 배치  
**변경:** 스키마 기준으로 먼저 그룹핑 → 각 스키마 그룹 내부에서 FK 연결 기반 서브클러스터 배치

```
[스키마 A 그룹]   [스키마 B 그룹]   [스키마 C 그룹]
  tbl1 → tbl2      tbl3 → tbl4       tbl5
  tbl2 → tbl3      (FK 내부 정렬)
```

스키마가 `null`인 테이블은 별도 "미분류" 그룹으로 처리.  
크로스 스키마 FK 선은 그룹 간에 그대로 표시.

---

## DDL / ORM Generator Changes

`ddl-generator.ts`, `orm-generator.ts`:
- `schema`가 있을 경우 `CREATE TABLE Legal.Contract (...)` 형태로 출력
- PostgreSQL: schema prefix 지원
- MySQL/MariaDB: database prefix로 처리 (`Legal.Contract`)
- MSSQL: schema prefix 지원 (`[Legal].[Contract]`)

---

## Out of Scope

- 스키마별 별도 다이어그램 (Option A)
- 시트/탭 (Option B) — 향후 레이어로 추가 가능
- 스키마 권한/접근제어
- 크로스 DB 참조

---

## Files to Change

| 파일 | 변경 내용 |
|------|----------|
| `packages/domain/src/types/diagram.type.ts` | `DiagramEntity`에 `schema` 추가, format v2 |
| `packages/domain/src/schema/create-empty-diagram.ts` | format v2 반영 |
| `packages/domain/src/utils/ddl-generator.ts` | schema prefix 출력 |
| `packages/domain/src/utils/orm-generator.ts` | schema prefix 출력 |
| `packages/domain/src/validation/validate-diagram.ts` | v1→v2 migration |
| `apps/web/src/features/editor/components/EditableTableNode.tsx` | 좌측 컬러 테두리 + 헤더 드롭다운 |
| `apps/web/src/features/editor/components/EditorCanvas.tsx` | computeAutoLayout 스키마 그루핑, 존 배경 렌더링 |
| `apps/web/src/features/editor/stores/useEditorStore.ts` | 스키마 필터 상태 추가 |
| `apps/web/src/features/editor/pages/EditorPage.tsx` | Schema filter sidebar 추가 |

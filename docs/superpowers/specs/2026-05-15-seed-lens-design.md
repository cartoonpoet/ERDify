# Seed Lens — Seed Data UX 개선 설계

**날짜:** 2026-05-15  
**상태:** 확정  
**배경:** ERD 편집 화면에서 Seed Data "추가" 클릭 시 컬럼 수에 비례해 노드 너비가 갑자기 확장되는 문제. 수백 행 import 시나리오를 고려한 고성능 인라인 편집 UX 필요.

---

## 선택된 방향: Seed Lens (B안)

Figma Component Edit Mode에서 영감. 편집 시 캔버스가 dim되고 노드 위에 풀 스프레드시트 패널이 뜸. 노드 DOM 크기 1px도 불변.

---

## 아키텍처

### 컴포넌트 구조

```
EditableTableNode/
  index.tsx              ← 트리거 버튼 추가, useSeedLens 연결
  SeedLens/
    index.tsx            ← Portal + backdrop + 패널 조합
    SeedLensGrid.tsx     ← 가상 스크롤 그리드 (핵심 퍼포먼스)
    SeedLensRow.tsx      ← 단일 행 (React.memo)
    useSeedLens.ts       ← 로컬 상태, open/close/commit 로직
    seed-lens.css.ts     ← Vanilla Extract 스타일
```

### 데이터 흐름

```
entity.seedData (DiagramDocument)
        │ 열릴 때 deep copy
        ▼
  localRows (useSeedLens 로컬 상태)
        │ 셀 편집 시 로컬만 업데이트
        │ (DOM 외부 어디도 re-render 없음)
        ▼
  닫힐 때 변경사항 있으면 setSeedData() 커맨드 한 번
        │
        ▼
  entity.seedData 업데이트 → 자동저장 → 실시간 협업 sync
```

---

## 퍼포먼스 설계

### 가상 스크롤 (`@tanstack/react-virtual`)

수백 행 import 시나리오를 위해 필수. DOM에는 viewport에 보이는 ~20행만 유지.

```
pnpm add @tanstack/react-virtual --filter @erdify/web
```

`useVirtualizer` 설정:
- `count`: `localRows.length`
- `estimateSize`: `() => 28` (행 높이 28px 고정)
- `overscan`: 5 (스크롤 시 끊김 방지)

### 로컬 상태 불변성

```ts
// useSeedLens.ts
const [localRows, setLocalRows] = useState<SeedRow[]>([]);

// 셀 업데이트 - 해당 행만 교체 (나머지 행 reference 유지)
const updateCell = useCallback((rowIdx: number, colId: string, value: string) => {
  setLocalRows(prev => {
    const next = [...prev];
    next[rowIdx] = { ...next[rowIdx], [colId]: value };
    return next;
  });
}, []);
```

### SeedLensRow 메모이제이션

```ts
// SeedLensRow.tsx
const SeedLensRow = React.memo(({ row, columns, rowIdx, activeCell, onCellChange, onCellFocus }) => {
  // ...
}, (prev, next) => {
  return prev.row === next.row &&        // 같은 reference면 re-render 스킵
         prev.activeCell === next.activeCell;
});
```

행 데이터가 변경되지 않으면 re-render 없음. 셀 하나 수정 시 해당 행만 re-render.

### Backdrop 처리

캔버스 DOM을 건드리지 않고 Portal로 backdrop만 띄움. `pointer-events: none`으로 캔버스 인터랙션 차단.

---

## UI 명세

### 트리거 (EditableTableNode)

기존 Seed Data 섹션 헤더에 버튼 변경:

```
SEED DATA    [✎ 편집]   ← 행이 있을 때
SEED DATA    [+ 추가]   ← 행이 없을 때 (클릭 시 렌즈 열고 빈 행 1개 자동 추가)
```

행 수 배지: `SEED DATA (3행)` 형태로 현재 행 수 표시.

### 렌즈 패널

- **위치**: `position: fixed`, viewport 중앙 (캔버스 줌/팬 영향 없음)
- **크기**: `width: min(860px, 90vw)`, `max-height: 70vh`
- **헤더**: `{테이블명} — Seed Data` + 행 수 + ✕ 버튼
- **그리드**:
  - 행 번호 컬럼 (32px 고정)
  - 컬럼별 셀 (균등 분배, 최소 80px)
  - 컬럼 헤더 sticky (스크롤 시 고정)
- **푸터**: `+ 행 추가` | `행 수` | 키보드 힌트 | `완료` 버튼

### 키보드 네비게이션

| 키 | 동작 |
|---|---|
| `Tab` | 다음 셀 (행 끝에서 다음 행 첫 셀) |
| `Shift+Tab` | 이전 셀 |
| `Enter` | 다음 행 같은 컬럼 (없으면 새 행 추가) |
| `Esc` | 렌즈 닫기 (변경사항 commit) |
| `Delete` / `Backspace` | 셀 값 지우기 |

### 닫기 동작

변경사항(localRows ≠ entity.seedData) 여부 확인:
- 변경 있음 → `setSeedData(doc, entityId, localRows)` 커맨드 → 렌즈 닫기
- 변경 없음 → 그냥 닫기 (불필요한 커맨드 방지)

---

## 스타일

Vanilla Extract (`seed-lens.css.ts`). 기존 ERD 노드 디자인 토큰 재사용.

- backdrop: `rgba(10, 20, 40, 0.5)` + `backdrop-filter: blur(2px)`
- 패널: `border: 2px solid var(--color-primary)`, `border-radius: 10px`
- 셀 포커스: `box-shadow: inset 0 0 0 2px var(--color-primary)`
- 행 홀수/짝수 배경 교차 (가독성)

---

## 구현 범위 (이번 PR)

**포함:**
- `SeedLens` 컴포넌트 (Portal + backdrop + 가상 스크롤 그리드)
- `useSeedLens` 훅 (로컬 상태, commit 로직)
- `EditableTableNode` 트리거 버튼 변경
- `@tanstack/react-virtual` 패키지 추가
- 키보드 네비게이션 (Tab/Enter/Esc)

**제외 (추후):**
- 행 드래그 순서 변경
- CSV 붙여넣기 일괄 입력
- 컬럼 너비 리사이즈

---

## 영향 범위

| 파일 | 변경 |
|---|---|
| `EditableTableNode/index.tsx` | 트리거 버튼 변경, SeedLens 연결 |
| `EditableTableNode/SeedLens/` | 신규 디렉터리 전체 |
| `apps/web/package.json` | `@tanstack/react-virtual` 추가 |

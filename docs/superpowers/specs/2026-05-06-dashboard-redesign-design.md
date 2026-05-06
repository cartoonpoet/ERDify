# 대시보드 리디자인 — Design Spec

**Date:** 2026-05-06
**Scope:** 대시보드 레이아웃 재구성 + 디자인 토큰 확장

---

## 1. 목표

| 항목 | 현재 | 변경 후 |
|---|---|---|
| 레이아웃 | OrgRail(52px) + ProjectSidebar(220px) + Main | UnifiedSidebar(260px) + Main |
| 조직 전환 | 왼쪽 아이콘 레일 클릭 | 사이드바 상단 셀렉터 드롭다운 |
| 프로젝트 목록 | 별도 사이드바 | 셀렉터 아래 트리 |
| ERD 접근 | 메인 카드만 | 사이드바 트리 + 메인 카드 (둘 다) |
| 검색 | 없음 | Topbar 검색창 (선택된 프로젝트 내 다이어그램 이름 필터) |

---

## 2. 디자인 토큰 확장 (`tokens.css.ts`)

기존 `color`, `space`, `radius`, `shadow`, `font.family`에 **fontSize, fontWeight** 추가.

```typescript
font: {
  family: "...",  // 기존 유지
  size: {
    "2xs": "9px",
    xs:    "10px",
    sm:    "11px",
    md:    "13px",
    lg:    "15px",
    xl:    "20px",
    "2xl": "24px",
  },
  weight: {
    regular:   "400",
    medium:    "500",
    semibold:  "600",
    bold:      "700",
    extrabold: "800",
  },
},
```

새로 만드는 CSS 파일은 모두 `vars.font.size.*`, `vars.font.weight.*`를 사용한다.
기존 파일은 이번 범위에서 수정하지 않는다.

---

## 3. 파일 변경 목록

| 파일 | 작업 |
|---|---|
| `apps/web/src/design-system/tokens.css.ts` | 수정 — fontSize, fontWeight 추가 |
| `apps/web/src/features/dashboard/components/OrgRail.tsx` | **삭제** |
| `apps/web/src/features/dashboard/components/OrgRail.css.ts` | **삭제** |
| `apps/web/src/features/dashboard/components/OrgRail.test.tsx` | **삭제** |
| `apps/web/src/features/dashboard/components/ProjectSidebar.tsx` | **삭제** |
| `apps/web/src/features/dashboard/components/ProjectSidebar.css.ts` | **삭제** |
| `apps/web/src/features/dashboard/components/ProjectSidebar.test.tsx` | **삭제** |
| `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx` | **신규** |
| `apps/web/src/features/dashboard/components/unified-sidebar.css.ts` | **신규** |
| `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | 수정 |
| `apps/web/src/features/dashboard/pages/dashboard-page.css.ts` | 수정 |

---

## 4. UnifiedSidebar 컴포넌트

### Props

```typescript
interface UnifiedSidebarProps {
  orgs: OrgResponse[];
  selectedOrgId: string | null;
  onSelectOrg: (orgId: string) => void;
  onDeleteOrg: (orgId: string) => void;
  onCreateOrg: () => void;

  projects: ProjectResponse[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onCreateProject: () => void;

  diagrams: DiagramResponse[];   // 현재 선택된 프로젝트의 다이어그램 목록
  onCreateDiagram: () => void;   // 사이드바 "+ 새 ERD 만들기" 클릭
}
```

ERD 항목 클릭 시 `useNavigate`를 컴포넌트 내부에서 직접 사용한다 (`navigate('/diagrams/:id')`).

조직이 선택되지 않은 경우 org selector만 표시하고 프로젝트 트리는 렌더링하지 않는다.
```

### 섹션 구조

```
┌────────────────────────────────┐
│ [A] Acme Corp   3개 프로젝트  ⌄│  ← OrgSelector (클릭 시 드롭다운)
├────────────────────────────────┤
│ PROJECTS                       │
│ ▾ 📁 Backend API          4    │  ← 선택+펼쳐진 프로젝트
│    • 사용자 스키마 v2    [PG]  │  ← ERD 항목 (클릭→에디터 이동)
│    • 상품 카탈로그       [MY]  │
│    + 새 ERD 만들기             │
│ ▸ 📁 Auth Service         2    │
│ ▸ 📁 Analytics            1    │
├────────────────────────────────┤
│ [ + 새 프로젝트 ]              │
└────────────────────────────────┘
```

### 동작 규칙

- **조직 셀렉터**: 클릭 시 드롭다운 표시. 드롭다운은 onBlur로 닫힘. 드롭다운에 조직 목록 + "새 조직 만들기" 포함.
- **프로젝트 클릭**: 해당 프로젝트를 선택(`onSelectProject`) + 자동으로 펼침. 이미 선택된 프로젝트는 클릭해도 접히지 않음 (UX 안정성).
- **ERD 항목 클릭**: `navigate('/diagrams/:id')` — DashboardPage에서 받은 `useNavigate`를 통해 이동.
- **"+ 새 ERD 만들기"**: 펼쳐진 프로젝트 ERD 목록 하단에 항상 표시. 클릭 시 diagram 생성 모달 오픈.
- **삭제 버튼**: 프로젝트 row hover 시 우측에 × 노출. 기존 동작 동일.
- **accordion**: 한 번에 하나의 프로젝트만 펼쳐짐. 다른 프로젝트 클릭 시 이전 것 자동 접힘.

---

## 5. OrgSelector 드롭다운

```
┌──────────────────────────────┐
│ ✓  [A]  Acme Corp            │  ← 현재 조직 (체크 표시)
│    [M]  Metabase Inc         │
│─────────────────────────────│
│    +  새 조직 만들기          │
└──────────────────────────────┘
```

- `position: absolute`, `top: 100%`, `left: 0`, `zIndex: 200`
- 조직 선택 시 드롭다운 닫고 `onSelectOrg` 호출
- 조직 삭제는 드롭다운 안 hover 시 우측 × 표시

---

## 6. Topbar 검색창

- Topbar 우측(아바타 왼쪽)에 검색 입력창 추가
- `width: 220px`, placeholder: `다이어그램 검색... ⌘K`
- 타이핑 시 DiagramGrid의 diagrams 목록을 이름 기준으로 클라이언트 필터링
- 프로젝트가 선택되지 않은 상태에서는 비활성화(disabled)
- 검색어 state는 DashboardPage에서 관리 → DiagramGrid에 `filterQuery` prop으로 전달

### DashboardPage 변경

```typescript
const [searchQuery, setSearchQuery] = useState("");
// 프로젝트가 바뀔 때 검색어 초기화
// searchQuery를 DiagramGrid에 전달
```

### DiagramGrid 변경

```typescript
interface DiagramGridProps {
  // ... 기존 props
  filterQuery?: string;  // 추가
}
// applyFilter 함수 내에서 filterQuery가 있으면 이름 포함 여부로 추가 필터링
```

---

## 7. dashboard-page.css.ts 변경

```typescript
// body: 기존 3열 → 2열
export const body = style({
  display: "grid",
  gridTemplateColumns: "260px 1fr",  // 52px 220px 1fr → 260px 1fr
  overflow: "hidden",
});

// emptySidebar 제거 (UnifiedSidebar가 항상 렌더링되므로 불필요)

// topbar-search 추가
export const topbarSearch = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  background: vars.color.surfaceTertiary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  width: "220px",
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.focusRing}` },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
});
```

---

## 8. unified-sidebar.css.ts 주요 스타일

모든 값은 `vars.*` 토큰 사용. 예외 없음.

```typescript
export const sidebar = style({
  width: "260px",
  background: vars.color.surface,
  borderRight: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
});

export const orgSelector = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["3"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  cursor: "pointer",
  selectors: { "&:hover": { background: vars.color.surfaceTertiary } },
});

export const orgBadge = style({
  width: "30px", height: "30px",
  borderRadius: vars.radius.org,
  background: vars.color.selectedBg,
  color: vars.color.primary,
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.bold,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
});

export const orgName = style({
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary,
});

export const orgSub = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  marginTop: "1px",
});

// project rows, erd rows, etc. — 동일하게 vars.* 사용
```

---

## 9. 삭제 처리

`OrgRail`, `ProjectSidebar`와 해당 test 파일 3개를 `git rm`으로 삭제.
DashboardPage에서 해당 import 제거.

---

## 10. 검색 기능 범위

- 현재 선택된 프로젝트의 다이어그램 이름 필터링만 구현
- 전체 조직·프로젝트 통합 검색은 이번 범위 밖

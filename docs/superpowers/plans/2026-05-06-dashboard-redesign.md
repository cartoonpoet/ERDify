# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OrgRail (52px) + ProjectSidebar (220px) dual-sidebar layout with a single UnifiedSidebar (260px) containing an org-selector dropdown and project/ERD accordion tree, plus a topbar search input for diagram filtering.

**Architecture:** Extend design tokens with `font.size.*` and `font.weight.*`, then build the new `UnifiedSidebar` component (TDD), extend `DiagramGrid` with a `filterQuery` prop, and wire everything together in `DashboardPage` while deleting the old `OrgRail` and `ProjectSidebar` components.

**Tech Stack:** React + vanilla-extract CSS, TanStack Query, React Router v6, Vitest + @testing-library/react

---

## File Map

| File | Action |
|---|---|
| `apps/web/src/design-system/tokens.css.ts` | Modify — add `font.size.*` and `font.weight.*` |
| `apps/web/src/features/dashboard/components/unified-sidebar.css.ts` | Create — all sidebar styles using `vars.*` |
| `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx` | Create — new component |
| `apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx` | Create — TDD tests |
| `apps/web/src/features/dashboard/components/DiagramGrid.tsx` | Modify — add `filterQuery` prop |
| `apps/web/src/features/dashboard/components/DiagramGrid.test.tsx` | Modify — add filterQuery test |
| `apps/web/src/features/dashboard/pages/dashboard-page.css.ts` | Modify — 2-col grid, add topbarSearch |
| `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | Modify — swap sidebars, add search state |
| `apps/web/src/features/dashboard/components/OrgRail.tsx` | Delete (git rm) |
| `apps/web/src/features/dashboard/components/OrgRail.css.ts` | Delete (git rm) |
| `apps/web/src/features/dashboard/components/OrgRail.test.tsx` | Delete (git rm) |
| `apps/web/src/features/dashboard/components/ProjectSidebar.tsx` | Delete (git rm) |
| `apps/web/src/features/dashboard/components/ProjectSidebar.css.ts` | Delete (git rm) |
| `apps/web/src/features/dashboard/components/ProjectSidebar.test.tsx` | Delete (git rm) |

---

## Task 1: Extend Design Tokens

**Files:**
- Modify: `apps/web/src/design-system/tokens.css.ts`

- [ ] **Step 1: Add font.size and font.weight to tokens.css.ts**

Replace the existing `font` property (lines 22–25):

```typescript
font: {
  family:
    "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
},
```

With:

```typescript
font: {
  family:
    "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  size: {
    "2xs": "9px",
    xs: "10px",
    sm: "11px",
    md: "13px",
    lg: "15px",
    xl: "20px",
    "2xl": "24px",
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
},
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/design-system/tokens.css.ts
git commit -m "feat(design-system): add font.size and font.weight tokens"
```

---

## Task 2: Create unified-sidebar.css.ts

**Files:**
- Create: `apps/web/src/features/dashboard/components/unified-sidebar.css.ts`

- [ ] **Step 1: Create the CSS file**

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const sidebar = style({
  width: "260px",
  background: vars.color.surface,
  borderRight: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
});

export const orgSelectorWrapper = style({
  position: "relative",
  outline: "none",
});

export const orgSelector = style({
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["3"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const orgBadge = style({
  width: "30px",
  height: "30px",
  borderRadius: vars.radius.org,
  background: vars.color.selectedBg,
  color: vars.color.primary,
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.bold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const orgInfo = style({
  flex: 1,
  minWidth: 0,
  textAlign: "left",
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

export const orgChevron = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
});

export const orgPlaceholder = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textDisabled,
  flex: 1,
});

export const orgDropdown = style({
  position: "absolute",
  top: "100%",
  left: 0,
  zIndex: 200,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.md,
  minWidth: "100%",
  overflow: "hidden",
});

export const orgDropdownItemWrapper = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

export const orgDropdownItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const orgDropdownDeleteBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textDisabled,
  fontSize: vars.font.size.md,
  padding: "2px 4px",
  borderRadius: vars.radius.sm,
  opacity: 0,
  transition: "opacity 150ms ease, color 150ms ease",
  flexShrink: 0,
  marginRight: vars.space["2"],
  lineHeight: 1,
  selectors: {
    "&:hover": { color: vars.color.error },
    [`${orgDropdownItemWrapper}:hover &`]: { opacity: 1 },
  },
});

export const orgDropdownDivider = style({
  height: "1px",
  background: vars.color.border,
  margin: `${vars.space["1"]} 0`,
});

export const orgDropdownCreateBtn = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.primary,
  fontWeight: vars.font.weight.medium,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.selectedBg },
  },
});

export const checkMark = style({
  width: vars.space["3"],
  fontSize: vars.font.size.xs,
  color: vars.color.primary,
  textAlign: "center",
  flexShrink: 0,
});

export const orgBadgeSmall = style({
  width: "22px",
  height: "22px",
  borderRadius: vars.radius.org,
  background: vars.color.selectedBg,
  color: vars.color.primary,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.bold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const orgDropdownName = style({
  fontSize: vars.font.size.sm,
  flex: 1,
});

export const tree = style({
  flex: 1,
  overflowY: "auto",
  padding: "8px 0",
});

export const treeSectionLabel = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.7px",
  textTransform: "uppercase",
  padding: `6px 14px ${vars.space["1"]}`,
});

export const projRowWrapper = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

export const projRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `6px 14px`,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const projRowActive = style({
  background: vars.color.selectedBg,
});

export const projArrow = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  flexShrink: 0,
  width: vars.space["3"],
  textAlign: "center",
});

export const projIcon = style({
  fontSize: vars.font.size.sm,
  flexShrink: 0,
});

export const projName = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "left",
});

export const projDeleteBtn = style({
  position: "absolute",
  right: vars.space["3"],
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textDisabled,
  fontSize: vars.font.size.md,
  lineHeight: 1,
  padding: "2px 4px",
  borderRadius: vars.radius.sm,
  opacity: 0,
  transition: "opacity 150ms ease, color 150ms ease",
  flexShrink: 0,
  selectors: {
    "&:hover": { color: vars.color.error },
    [`${projRowWrapper}:hover &`]: { opacity: 1 },
  },
});

export const erdRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["1"]} 14px ${vars.space["1"]} 34px`,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const erdDot = style({
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  background: vars.color.borderStrong,
  flexShrink: 0,
});

export const erdName = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  flex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
});

export const erdBadge = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.semibold,
  padding: "1px 4px",
  borderRadius: "3px",
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  flexShrink: 0,
});

export const erdNewBtn = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["1"]} 14px ${vars.space["1"]} 34px`,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  fontWeight: vars.font.weight.medium,
  selectors: {
    "&:hover": { color: vars.color.primary },
  },
});

export const sidebarFooter = style({
  padding: "10px 14px",
  borderTop: `1px solid ${vars.color.border}`,
});

export const addProjectBtn = style({
  padding: "5px 10px",
  border: `1.5px dashed ${vars.color.borderStrong}`,
  borderRadius: vars.radius.md,
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  textAlign: "center",
  cursor: "pointer",
  background: "none",
  fontFamily: vars.font.family,
  width: "100%",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      color: vars.color.primary,
      background: vars.color.selectedBg,
    },
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/dashboard/components/unified-sidebar.css.ts
git commit -m "feat(dashboard): add unified sidebar CSS with design tokens"
```

---

## Task 3: TDD UnifiedSidebar Component

**Files:**
- Create: `apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx`
- Create: `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UnifiedSidebar } from "./UnifiedSidebar";
import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const orgs: OrgResponse[] = [
  { id: "org-1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "" },
  { id: "org-2", name: "My Team", ownerId: "u1", createdAt: "", updatedAt: "" },
];

const projects: ProjectResponse[] = [
  { id: "p1", organizationId: "org-1", name: "Backend API", description: null, createdAt: "", updatedAt: "" },
  { id: "p2", organizationId: "org-1", name: "Auth Service", description: null, createdAt: "", updatedAt: "" },
];

const makeContent = (dialect: "postgresql" | "mysql") => ({
  format: "erdify.schema.v1" as const,
  id: "doc-1",
  name: "test",
  dialect,
  entities: [],
  relationships: [],
  indexes: [] as [],
  views: [] as [],
  layout: { entityPositions: {} },
  metadata: { revision: 0, stableObjectIds: true as const, createdAt: "", updatedAt: "" },
});

const diagrams: DiagramResponse[] = [
  {
    id: "d1", projectId: "p1", organizationId: "org-1", name: "사용자 스키마",
    content: makeContent("postgresql"), createdBy: "u1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), myRole: "editor" as const,
    shareToken: null, shareExpiresAt: null,
  },
];

const defaultProps = {
  orgs,
  selectedOrgId: "org-1",
  onSelectOrg: vi.fn(),
  onDeleteOrg: vi.fn(),
  onCreateOrg: vi.fn(),
  projects,
  selectedProjectId: null,
  onSelectProject: vi.fn(),
  onDeleteProject: vi.fn(),
  onCreateProject: vi.fn(),
  diagrams: [],
  onCreateDiagram: vi.fn(),
};

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("UnifiedSidebar", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("선택된 조직 이름을 렌더링한다", () => {
    wrap(<UnifiedSidebar {...defaultProps} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("조직이 선택되지 않으면 프로젝트 트리를 렌더링하지 않는다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedOrgId={null} />);
    expect(screen.queryByText("Backend API")).not.toBeInTheDocument();
  });

  it("조직 셀렉터 클릭 시 드롭다운이 열린다", () => {
    wrap(<UnifiedSidebar {...defaultProps} />);
    const selectorBtn = screen.getByText("Acme Corp").closest("button")!;
    fireEvent.click(selectorBtn);
    expect(screen.getByText("My Team")).toBeInTheDocument();
  });

  it("드롭다운에서 조직 클릭 시 onSelectOrg가 호출된다", () => {
    const onSelectOrg = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onSelectOrg={onSelectOrg} />);
    fireEvent.click(screen.getByText("Acme Corp").closest("button")!);
    fireEvent.click(screen.getByText("My Team").closest("button")!);
    expect(onSelectOrg).toHaveBeenCalledWith("org-2");
  });

  it("드롭다운 '+ 새 조직 만들기' 클릭 시 onCreateOrg가 호출된다", () => {
    const onCreateOrg = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onCreateOrg={onCreateOrg} />);
    fireEvent.click(screen.getByText("Acme Corp").closest("button")!);
    fireEvent.click(screen.getByText("+ 새 조직 만들기"));
    expect(onCreateOrg).toHaveBeenCalledTimes(1);
  });

  it("조직이 선택되면 프로젝트 목록을 렌더링한다", () => {
    wrap(<UnifiedSidebar {...defaultProps} />);
    expect(screen.getByText("Backend API")).toBeInTheDocument();
    expect(screen.getByText("Auth Service")).toBeInTheDocument();
  });

  it("프로젝트 클릭 시 onSelectProject가 호출된다", () => {
    const onSelectProject = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onSelectProject={onSelectProject} />);
    fireEvent.click(screen.getByText("Backend API").closest("button")!);
    expect(onSelectProject).toHaveBeenCalledWith("p1");
  });

  it("선택된 프로젝트가 있으면 ERD 목록을 렌더링한다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedProjectId="p1" diagrams={diagrams} />);
    expect(screen.getByText("사용자 스키마")).toBeInTheDocument();
  });

  it("ERD 항목 클릭 시 해당 다이어그램 경로로 navigate가 호출된다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedProjectId="p1" diagrams={diagrams} />);
    fireEvent.click(screen.getByText("사용자 스키마").closest("button")!);
    expect(mockNavigate).toHaveBeenCalledWith("/diagrams/d1");
  });

  it("펼쳐진 프로젝트에 '+ 새 ERD 만들기' 버튼이 표시된다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedProjectId="p1" diagrams={diagrams} />);
    expect(screen.getByText("+ 새 ERD 만들기")).toBeInTheDocument();
  });

  it("'+ 새 ERD 만들기' 클릭 시 onCreateDiagram이 호출된다", () => {
    const onCreateDiagram = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} selectedProjectId="p1" diagrams={diagrams} onCreateDiagram={onCreateDiagram} />);
    fireEvent.click(screen.getByText("+ 새 ERD 만들기"));
    expect(onCreateDiagram).toHaveBeenCalledTimes(1);
  });

  it("'+ 새 프로젝트' 클릭 시 onCreateProject가 호출된다", () => {
    const onCreateProject = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onCreateProject={onCreateProject} />);
    fireEvent.click(screen.getByText("+ 새 프로젝트"));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd apps/web && npx vitest run src/features/dashboard/components/UnifiedSidebar.test.tsx --reporter verbose`

Expected: all tests fail with "Cannot find module './UnifiedSidebar'"

- [ ] **Step 3: Create UnifiedSidebar.tsx**

Create `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx`:

```tsx
import { useState } from "react";
import type { FocusEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";
import * as css from "./unified-sidebar.css";

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

  diagrams: DiagramResponse[];
  onCreateDiagram: () => void;
}

const dialectLabel: Record<string, string> = { postgresql: "PG", mysql: "MY" };

export const UnifiedSidebar = ({
  orgs, selectedOrgId, onSelectOrg, onDeleteOrg, onCreateOrg,
  projects, selectedProjectId, onSelectProject, onDeleteProject, onCreateProject,
  diagrams, onCreateDiagram,
}: UnifiedSidebarProps) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? null;

  function handleWrapperBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropdownOpen(false);
  }

  return (
    <aside className={css.sidebar} aria-label="사이드바">
      <div
        className={css.orgSelectorWrapper}
        tabIndex={-1}
        onBlur={handleWrapperBlur}
      >
        <button
          className={css.orgSelector}
          onClick={() => setDropdownOpen((v) => !v)}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
        >
          {selectedOrg ? (
            <>
              <div className={css.orgBadge} aria-hidden="true">
                {selectedOrg.name.charAt(0).toUpperCase()}
              </div>
              <div className={css.orgInfo}>
                <div className={css.orgName}>{selectedOrg.name}</div>
                <div className={css.orgSub}>{projects.length}개 프로젝트</div>
              </div>
            </>
          ) : (
            <span className={css.orgPlaceholder}>조직을 선택하세요</span>
          )}
          <span className={css.orgChevron} aria-hidden="true">⌄</span>
        </button>

        {dropdownOpen && (
          <div className={css.orgDropdown} role="listbox">
            {orgs.map((org) => (
              <div key={org.id} className={css.orgDropdownItemWrapper}>
                <button
                  className={css.orgDropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOrg(org.id);
                    setDropdownOpen(false);
                  }}
                >
                  <span className={css.checkMark} aria-hidden="true">
                    {org.id === selectedOrgId ? "✓" : ""}
                  </span>
                  <span className={css.orgBadgeSmall} aria-hidden="true">
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={css.orgDropdownName}>{org.name}</span>
                </button>
                <button
                  className={css.orgDropdownDeleteBtn}
                  aria-label={`${org.name} 삭제`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`"${org.name}" 조직을 삭제하시겠습니까? 모든 프로젝트와 ERD가 함께 삭제됩니다.`)) {
                      onDeleteOrg(org.id);
                    }
                    setDropdownOpen(false);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div className={css.orgDropdownDivider} />
            <button
              className={css.orgDropdownCreateBtn}
              onClick={(e) => {
                e.stopPropagation();
                onCreateOrg();
                setDropdownOpen(false);
              }}
            >
              + 새 조직 만들기
            </button>
          </div>
        )}
      </div>

      {selectedOrgId && (
        <>
          <div className={css.tree}>
            <div className={css.treeSectionLabel}>프로젝트</div>
            {projects.map((project) => {
              const isExpanded = selectedProjectId === project.id;
              return (
                <div key={project.id}>
                  <div className={css.projRowWrapper}>
                    <button
                      className={[css.projRow, isExpanded ? css.projRowActive : ""].filter(Boolean).join(" ")}
                      onClick={() => onSelectProject(project.id)}
                      aria-pressed={isExpanded}
                    >
                      <span className={css.projArrow} aria-hidden="true">{isExpanded ? "▾" : "▸"}</span>
                      <span className={css.projIcon} aria-hidden="true">📁</span>
                      <span className={css.projName}>{project.name}</span>
                    </button>
                    <button
                      className={css.projDeleteBtn}
                      aria-label={`${project.name} 삭제`}
                      onClick={() => {
                        if (window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까? 모든 ERD가 함께 삭제됩니다.`)) {
                          onDeleteProject(project.id);
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                  {isExpanded && (
                    <>
                      {diagrams.map((diagram) => (
                        <button
                          key={diagram.id}
                          className={css.erdRow}
                          onClick={() => navigate(`/diagrams/${diagram.id}`)}
                        >
                          <span className={css.erdDot} aria-hidden="true" />
                          <span className={css.erdName}>{diagram.name}</span>
                          <span className={css.erdBadge} aria-hidden="true">
                            {dialectLabel[diagram.content.dialect] ?? diagram.content.dialect.slice(0, 2).toUpperCase()}
                          </span>
                        </button>
                      ))}
                      <button className={css.erdNewBtn} onClick={onCreateDiagram}>
                        + 새 ERD 만들기
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className={css.sidebarFooter}>
            <button className={css.addProjectBtn} onClick={onCreateProject}>
              + 새 프로젝트
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd apps/web && npx vitest run src/features/dashboard/components/UnifiedSidebar.test.tsx --reporter verbose`

Expected: all 11 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/UnifiedSidebar.tsx \
        apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx
git commit -m "feat(dashboard): add UnifiedSidebar component with TDD"
```

---

## Task 4: Add filterQuery to DiagramGrid

**Files:**
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.test.tsx`
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.tsx`

- [ ] **Step 1: Add failing test to DiagramGrid.test.tsx**

Append to the existing `describe("DiagramGrid", ...)` block in `DiagramGrid.test.tsx`:

```tsx
  it("filterQuery가 있으면 이름에 해당 문자열이 포함된 다이어그램만 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={diagrams} currentUserId="user-1" onCreateDiagram={vi.fn()} onDeleteDiagram={vi.fn()} filterQuery="User" />);
    expect(screen.getByText("User Schema")).toBeInTheDocument();
    expect(screen.queryByText("Order Schema")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test — verify it fails**

Run: `cd apps/web && npx vitest run src/features/dashboard/components/DiagramGrid.test.tsx --reporter verbose`

Expected: new test fails (filterQuery prop not accepted)

- [ ] **Step 3: Update DiagramGrid.tsx — add filterQuery**

In `DiagramGrid.tsx`, make two changes:

**1. Add `filterQuery` to `DiagramGridProps` interface** (after `loading?: boolean`):

```typescript
interface DiagramGridProps {
  diagrams: DiagramResponse[];
  projectName?: string;
  currentUserId: string | null;
  onCreateDiagram: () => void;
  onImportDiagram?: () => void;
  onDeleteDiagram: (diagramId: string) => void;
  loading?: boolean;
  filterQuery?: string;
}
```

**2. Update `applyFilter` function** (replace lines 49–57):

```typescript
function applyFilter(
  diagrams: DiagramResponse[],
  filter: FilterType,
  userId: string | null,
  filterQuery?: string,
): DiagramResponse[] {
  let result = diagrams;
  if (filter === "recent") {
    result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } else if (filter === "mine") {
    result = result.filter((d) => d.createdBy !== null && d.createdBy === userId);
  }
  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    result = result.filter((d) => d.name.toLowerCase().includes(q));
  }
  return result;
}
```

**3. Update the `DiagramGrid` component destructuring** to include `filterQuery`, and pass it to `applyFilter`:

Replace:
```typescript
export const DiagramGrid = ({ diagrams, projectName, currentUserId, onCreateDiagram, onImportDiagram, onDeleteDiagram, loading = false }: DiagramGridProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareDiagramItem, setShareDiagramItem] = useState<DiagramResponse | null>(null);
  const filtered = applyFilter(diagrams, activeFilter, currentUserId);
```

With:
```typescript
export const DiagramGrid = ({ diagrams, projectName, currentUserId, onCreateDiagram, onImportDiagram, onDeleteDiagram, loading = false, filterQuery }: DiagramGridProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareDiagramItem, setShareDiagramItem] = useState<DiagramResponse | null>(null);
  const filtered = applyFilter(diagrams, activeFilter, currentUserId, filterQuery);
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd apps/web && npx vitest run src/features/dashboard/components/DiagramGrid.test.tsx --reporter verbose`

Expected: all 5 tests pass (4 existing + 1 new)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/DiagramGrid.tsx \
        apps/web/src/features/dashboard/components/DiagramGrid.test.tsx
git commit -m "feat(dashboard): add filterQuery prop to DiagramGrid"
```

---

## Task 5: Wire DashboardPage and Remove Old Sidebars

**Files:**
- Modify: `apps/web/src/features/dashboard/pages/dashboard-page.css.ts`
- Modify: `apps/web/src/features/dashboard/pages/DashboardPage.tsx`
- Delete: `apps/web/src/features/dashboard/components/OrgRail.tsx`
- Delete: `apps/web/src/features/dashboard/components/OrgRail.css.ts`
- Delete: `apps/web/src/features/dashboard/components/OrgRail.test.tsx`
- Delete: `apps/web/src/features/dashboard/components/ProjectSidebar.tsx`
- Delete: `apps/web/src/features/dashboard/components/ProjectSidebar.css.ts`
- Delete: `apps/web/src/features/dashboard/components/ProjectSidebar.test.tsx`

- [ ] **Step 1: Update dashboard-page.css.ts**

Replace the full content of `apps/web/src/features/dashboard/pages/dashboard-page.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const shell = style({
  display: "grid",
  gridTemplateRows: "48px 1fr",
  height: "100vh",
  overflow: "hidden",
});

export const topbar = style({
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  padding: `0 ${vars.space["5"]}`,
  gap: vars.space["3"],
});

export const brand = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
});

export const brandLogo = style({
  display: "block",
  width: "123px",
  height: "32px",
});

export const topbarSpacer = style({ flex: 1 });

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

export const avatar = style({
  width: "30px",
  height: "30px",
  background: vars.color.primary,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
  cursor: "pointer",
});

export const avatarImg = style({
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  objectFit: "cover",
  cursor: "pointer",
  border: `1.5px solid ${vars.color.border}`,
});

export const body = style({
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  overflow: "hidden",
});

export const avatarWrapper = style({
  position: "relative",
  outline: "none",
});

export const dropdown = style({
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.lg,
  minWidth: "200px",
  overflow: "hidden",
  zIndex: 200,
});

export const dropdownHeader = style({
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const dropdownEmail = style({
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.semibold,
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const dropdownItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  width: "100%",
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: vars.font.size.md,
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const dropdownItemDanger = style({
  color: vars.color.error,
  selectors: {
    "&:hover": { background: `${vars.color.error}0f` },
  },
});
```

Note: `emptySidebar` is removed (UnifiedSidebar always renders); `avatar` and `dropdownEmail`/`dropdownItem` now use `vars.font.size.*` and `vars.font.weight.*`.

- [ ] **Step 2: Update DashboardPage.tsx**

Replace the full content of `apps/web/src/features/dashboard/pages/DashboardPage.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FocusEvent } from "react";
import { listMyOrganizations, deleteOrganization } from "../../../shared/api/organizations.api";
import { listProjects, deleteProject } from "../../../shared/api/projects.api";
import { listDiagrams, deleteDiagram } from "../../../shared/api/diagrams.api";
import { getMe, logout } from "../../../shared/api/auth.api";
import { API_BASE_URL } from "../../../shared/api/httpClient";
import { useWorkspaceStore } from "../../../shared/stores/useWorkspaceStore";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { UnifiedSidebar } from "../components/UnifiedSidebar";
import { DiagramGrid } from "../components/DiagramGrid";
import { CreateOrgModal } from "../components/CreateOrgModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateDiagramModal } from "../components/CreateDiagramModal";
import { ImportDiagramModal } from "../components/ImportDiagramModal";
import { ProfileModal } from "../components/ProfileModal";
import {
  shell, topbar, brand, brandLogo, topbarSpacer, topbarSearch, avatar, avatarImg,
  avatarWrapper, dropdown, dropdownHeader, dropdownEmail,
  dropdownItem, dropdownItemDanger, body,
} from "./dashboard-page.css";

function getInitial(email: string | undefined | null): string {
  return (email?.split("@")[0]?.[0] ?? "?").toUpperCase();
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrganizationId, selectedProjectId, selectOrganization, selectProject, reset } =
    useWorkspaceStore();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: listMyOrganizations,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", selectedOrganizationId],
    queryFn: () => listProjects(selectedOrganizationId!),
    enabled: !!selectedOrganizationId,
  });

  const { data: diagrams = [], isLoading: diagramsLoading } = useQuery({
    queryKey: ["diagrams", selectedProjectId],
    queryFn: () => listDiagrams(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (orgId: string) => deleteOrganization(orgId),
    onSuccess: (_data, orgId) => {
      if (selectedOrganizationId === orgId) reset();
      void queryClient.invalidateQueries({ queryKey: ["orgs"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => deleteProject(selectedOrganizationId!, projectId),
    onSuccess: (_data, projectId) => {
      if (selectedProjectId === projectId) selectOrganization(selectedOrganizationId!);
      void queryClient.invalidateQueries({ queryKey: ["projects", selectedOrganizationId] });
    },
  });

  const deleteDiagramMutation = useMutation({
    mutationFn: (diagramId: string) => deleteDiagram(diagramId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diagrams", selectedProjectId] });
    },
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  async function handleLogout() {
    await logout().catch(() => undefined);
    setAuthenticated(false);
    reset();
    queryClient.clear();
    navigate("/login");
  }

  function handleAvatarMenuBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
  }

  function handleAvatarClick() {
    setMenuOpen((v) => !v);
  }

  function handleOpenOrgModal() { setOrgModalOpen(true); }
  function handleCloseOrgModal() { setOrgModalOpen(false); }
  function handleOrgCreated() { void queryClient.invalidateQueries({ queryKey: ["orgs"] }); }

  function handleOpenProjectModal() { setProjectModalOpen(true); }
  function handleCloseProjectModal() { setProjectModalOpen(false); }
  function handleProjectCreated() {
    void queryClient.invalidateQueries({ queryKey: ["projects", selectedOrganizationId] });
  }

  function handleOpenDiagramModal() { setDiagramModalOpen(true); }
  function handleCloseDiagramModal() { setDiagramModalOpen(false); }
  function handleDiagramCreated(id: string) { navigate(`/diagrams/${id}`); }

  function handleOpenImportModal() { setImportModalOpen(true); }
  function handleCloseImportModal() { setImportModalOpen(false); }
  function handleDiagramImported(id: string) { navigate(`/diagrams/${id}`); }

  function handleDeleteOrg(id: string) { deleteOrgMutation.mutate(id); }
  function handleDeleteDiagram(id: string) { deleteDiagramMutation.mutate(id); }

  function handleSelectProject(projectId: string) {
    selectProject(projectId);
    setSearchQuery("");
  }

  function handleDeleteProject(id: string) { deleteProjectMutation.mutate(id); }

  return (
    <div className={shell}>
      <header className={topbar}>
        <div className={brand}>
          <img src="/logo.svg" alt="ERDify" className={brandLogo} />
        </div>
        <div className={topbarSpacer} />

        <input
          className={topbarSearch}
          type="text"
          placeholder="다이어그램 검색... ⌘K"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!selectedProjectId}
          aria-label="다이어그램 검색"
        />

        <div className={avatarWrapper} tabIndex={-1} onBlur={handleAvatarMenuBlur}>
          {me?.avatarUrl ? (
            <img
              src={me.avatarUrl.startsWith("http") ? me.avatarUrl : `${API_BASE_URL}${me.avatarUrl}`}
              alt="프로필"
              className={avatarImg}
              onClick={handleAvatarClick}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className={avatar} onClick={handleAvatarClick}>
              {getInitial(me?.name ?? me?.email)}
            </div>
          )}

          {menuOpen && (
            <div className={dropdown}>
              <div className={dropdownHeader}>
                <div className={dropdownEmail}>{me?.name ?? me?.email ?? "사용자"}</div>
              </div>
              <button className={dropdownItem} onClick={() => { setMenuOpen(false); setProfileModalOpen(true); }}>
                회원정보 수정
              </button>
              <button className={dropdownItem} onClick={() => { setMenuOpen(false); navigate("/settings/api-keys"); }}>
                API 키 관리
              </button>
              <button className={`${dropdownItem} ${dropdownItemDanger}`} onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={body}>
        <UnifiedSidebar
          orgs={orgs}
          selectedOrgId={selectedOrganizationId}
          onSelectOrg={selectOrganization}
          onDeleteOrg={handleDeleteOrg}
          onCreateOrg={handleOpenOrgModal}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          onCreateProject={handleOpenProjectModal}
          diagrams={diagrams}
          onCreateDiagram={handleOpenDiagramModal}
        />

        <DiagramGrid
          diagrams={diagrams}
          {...(selectedProject?.name ? { projectName: selectedProject.name } : {})}
          currentUserId={me?.id ?? null}
          onCreateDiagram={handleOpenDiagramModal}
          {...(selectedProjectId ? { onImportDiagram: handleOpenImportModal } : {})}
          onDeleteDiagram={handleDeleteDiagram}
          loading={diagramsLoading && !!selectedProjectId}
          {...(searchQuery ? { filterQuery: searchQuery } : {})}
        />
      </div>

      <CreateOrgModal
        open={orgModalOpen}
        onClose={handleCloseOrgModal}
        onCreated={handleOrgCreated}
      />

      {selectedOrganizationId && (
        <CreateProjectModal
          open={projectModalOpen}
          onClose={handleCloseProjectModal}
          onCreated={handleProjectCreated}
          orgId={selectedOrganizationId}
        />
      )}

      {selectedProjectId && (
        <CreateDiagramModal
          open={diagramModalOpen}
          onClose={handleCloseDiagramModal}
          onCreated={handleDiagramCreated}
          projectId={selectedProjectId}
        />
      )}

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {selectedProjectId && (
        <ImportDiagramModal
          open={importModalOpen}
          projectId={selectedProjectId}
          onClose={handleCloseImportModal}
          onImported={handleDiagramImported}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 3: Delete the six old files**

```bash
git rm apps/web/src/features/dashboard/components/OrgRail.tsx \
       apps/web/src/features/dashboard/components/OrgRail.css.ts \
       apps/web/src/features/dashboard/components/OrgRail.test.tsx \
       apps/web/src/features/dashboard/components/ProjectSidebar.tsx \
       apps/web/src/features/dashboard/components/ProjectSidebar.css.ts \
       apps/web/src/features/dashboard/components/ProjectSidebar.test.tsx
```

- [ ] **Step 4: Run the full test suite**

Run: `cd apps/web && pnpm test`

Expected: all tests pass (OrgRail/ProjectSidebar tests gone, UnifiedSidebar + DiagramGrid tests pass)

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/dashboard/pages/dashboard-page.css.ts \
        apps/web/src/features/dashboard/pages/DashboardPage.tsx
git commit -m "feat(dashboard): wire UnifiedSidebar into DashboardPage, add topbar search, remove OrgRail/ProjectSidebar"
```

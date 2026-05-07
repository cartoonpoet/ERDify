# Dashboard URL-Based Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `memberManagementOpen`/`apiKeysOpen` boolean flags with URL-based nested routes so every dashboard panel has its own URL.

**Architecture:** `DashboardPage` becomes a layout route at `/:orgId` that renders `<Outlet context={...} />`. `DiagramGrid`, `MemberManagementPage`, and `ApiKeysPanel` become standalone route components reading `useParams()`. `UnifiedSidebar` navigates internally via `useNavigate`/`useParams` instead of receiving callbacks. `useWorkspaceStore` is deleted.

**Tech Stack:** React Router DOM v6, React Query v5, TypeScript, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/features/dashboard/pages/RootRedirect.tsx` | Redirect `/` → `/:firstOrgId` or show org creation |
| Modify | `apps/web/src/app/Router.tsx` | Nested routes under `/:orgId` |
| Modify | `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | Layout: shell + modals + mutations; exports `DashboardOutletContext` |
| Modify | `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx` | Internal data fetching + navigation |
| Modify | `apps/web/src/features/dashboard/components/DiagramGrid.tsx` | Route component: self-fetches via `useParams` + `useOutletContext` |
| Modify | `apps/web/src/features/dashboard/pages/MemberManagementPage.tsx` | Read `orgId` from `useParams` instead of props |
| Delete | `apps/web/src/shared/stores/useWorkspaceStore.ts` | Replaced by URL params |
| Delete | `apps/web/src/shared/stores/useWorkspaceStore.test.ts` | No longer needed |

---

## URL Structure (reference)

```
/                        → RootRedirect (→ /:firstOrgId or org creation)
/:orgId                  → DashboardPage layout / DiagramGrid (index)
/:orgId/members          → DashboardPage layout / MemberManagementPage
/:orgId/api-keys         → DashboardPage layout / ApiKeysPanel
/:orgId/:projectId       → DashboardPage layout / DiagramGrid
/diagrams/:diagramId     → EditorPage (unchanged)
```

---

## Task 1: Create RootRedirect

**Files:**
- Create: `apps/web/src/features/dashboard/pages/RootRedirect.tsx`

- [ ] **Step 1: Create RootRedirect.tsx**

```tsx
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyOrganizations } from "../../../shared/api/organizations.api";
import { CreateOrgModal } from "../components/CreateOrgModal";

export const RootRedirect = () => {
  const queryClient = useQueryClient();
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const { data: orgs, isLoading } = useQuery({
    queryKey: ["orgs"],
    queryFn: listMyOrganizations,
  });

  if (isLoading) return null;
  if (orgs && orgs.length > 0) return <Navigate to={`/${orgs[0].id}`} replace />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <button onClick={() => setOrgModalOpen(true)}>+ 새 조직 만들기</button>
      </div>
      <CreateOrgModal
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["orgs"] })}
      />
    </>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/dashboard/pages/RootRedirect.tsx
git commit -m "feat(web): add RootRedirect component for URL-based dashboard routing"
```

---

## Task 2: Update Router.tsx

**Files:**
- Modify: `apps/web/src/app/Router.tsx`

- [ ] **Step 1: Replace catch-all route with nested routes**

```tsx
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";

const LoginPage = lazy(() => import("../features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("../features/auth/pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const EditorPage = lazy(() => import("../features/editor/pages/EditorPage").then(m => ({ default: m.EditorPage })));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const DiagramGrid = lazy(() => import("../features/dashboard/components/DiagramGrid").then(m => ({ default: m.DiagramGrid })));
const MemberManagementPage = lazy(() => import("../features/dashboard/pages/MemberManagementPage").then(m => ({ default: m.MemberManagementPage })));
const ApiKeysPanel = lazy(() => import("../features/dashboard/pages/ApiKeysPanel").then(m => ({ default: m.ApiKeysPanel })));
const RootRedirect = lazy(() => import("../features/dashboard/pages/RootRedirect").then(m => ({ default: m.RootRedirect })));
const SharedDiagramPage = lazy(() => import("../features/shared-diagram/pages/SharedDiagramPage").then(m => ({ default: m.SharedDiagramPage })));

export const Router = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:shareToken" element={<SharedDiagramPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/diagrams/:diagramId" element={<EditorPage />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:orgId" element={<DashboardPage />}>
          <Route index element={<DiagramGrid />} />
          <Route path="members" element={<MemberManagementPage />} />
          <Route path="api-keys" element={<ApiKeysPanel />} />
          <Route path=":projectId" element={<DiagramGrid />} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/Router.tsx
git commit -m "feat(web): add nested dashboard routes under /:orgId"
```

---

## Task 3: Rewrite DashboardPage as Layout

**Files:**
- Modify: `apps/web/src/features/dashboard/pages/DashboardPage.tsx`

`DashboardPage` becomes a layout: shell + topbar + mutations + modals. Exports `DashboardOutletContext` for child routes.

Key changes from old code:
- Remove `useWorkspaceStore` — use `useParams()` for `orgId`/`projectId`
- Remove `memberManagementOpen`, `apiKeysOpen` state
- Remove `orgs`, `projects`, `diagrams` queries (each child route fetches its own)
- Remove `useEffect` auto-selects (RootRedirect handles initial org)
- Remove `handleSelectOrg`, `handleSelectProject`, `handleApiKeys` — navigation is in UnifiedSidebar
- Replace content conditional with `<Outlet context={outletCtx} />`
- Add `useEffect` to reset `searchQuery` on `projectId` change

- [ ] **Step 1: Rewrite DashboardPage.tsx**

```tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, Outlet } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FocusEvent } from "react";
import { deleteOrganization } from "../../../shared/api/organizations.api";
import { deleteProject } from "../../../shared/api/projects.api";
import { deleteDiagram } from "../../../shared/api/diagrams.api";
import { getMe, logout } from "../../../shared/api/auth.api";
import { API_BASE_URL } from "../../../shared/api/httpClient";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { UnifiedSidebar } from "../components/UnifiedSidebar";
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

export interface DashboardOutletContext {
  onCreateDiagram: () => void;
  onImportDiagram: () => void;
  onDeleteDiagram: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

function getInitial(email: string | undefined | null): string {
  return (email?.split("@")[0]?.[0] ?? "?").toUpperCase();
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { orgId, projectId } = useParams<{ orgId: string; projectId?: string }>();
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery("");
  }, [projectId]);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: (_data, deletedOrgId) => {
      if (orgId === deletedOrgId) navigate("/");
      void queryClient.invalidateQueries({ queryKey: ["orgs"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (pid: string) => deleteProject(orgId!, pid),
    onSuccess: (_data, deletedProjectId) => {
      if (projectId === deletedProjectId) navigate(`/${orgId}`);
      void queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
    },
  });

  const deleteDiagramMutation = useMutation({
    mutationFn: (id: string) => deleteDiagram(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diagrams", projectId] });
    },
  });

  async function handleLogout() {
    await logout().catch(() => undefined);
    setAuthenticated(false);
    queryClient.clear();
    navigate("/login");
  }

  function handleAvatarMenuBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
  }

  const outletCtx: DashboardOutletContext = {
    onCreateDiagram: () => setDiagramModalOpen(true),
    onImportDiagram: () => setImportModalOpen(true),
    onDeleteDiagram: (id) => deleteDiagramMutation.mutate(id),
    searchQuery,
    onSearchChange: setSearchQuery,
  };

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
          disabled={!projectId}
          aria-label="다이어그램 검색"
        />

        <div className={avatarWrapper} tabIndex={-1} onBlur={handleAvatarMenuBlur}>
          {me?.avatarUrl ? (
            <img
              src={me.avatarUrl.startsWith("http") ? me.avatarUrl : `${API_BASE_URL}${me.avatarUrl}`}
              alt="프로필"
              className={avatarImg}
              onClick={() => setMenuOpen((v) => !v)}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className={avatar} onClick={() => setMenuOpen((v) => !v)}>
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
              <button className={`${dropdownItem} ${dropdownItemDanger}`} onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={body}>
        <UnifiedSidebar
          onCreateOrg={() => setOrgModalOpen(true)}
          onDeleteOrg={(id) => deleteOrgMutation.mutate(id)}
          onCreateProject={() => setProjectModalOpen(true)}
          onDeleteProject={(id) => deleteProjectMutation.mutate(id)}
          onCreateDiagram={() => setDiagramModalOpen(true)}
        />

        <Outlet context={outletCtx} />
      </div>

      <CreateOrgModal
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["orgs"] })}
      />

      {orgId && (
        <CreateProjectModal
          open={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ["projects", orgId] })}
          orgId={orgId}
        />
      )}

      {projectId && (
        <CreateDiagramModal
          open={diagramModalOpen}
          onClose={() => setDiagramModalOpen(false)}
          onCreated={(id) => navigate(`/diagrams/${id}`)}
          projectId={projectId}
        />
      )}

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {projectId && (
        <ImportDiagramModal
          open={importModalOpen}
          projectId={projectId}
          onClose={() => setImportModalOpen(false)}
          onImported={(id) => navigate(`/diagrams/${id}`)}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /path/to/ERDify && pnpm --filter @erdify/web exec tsc --noEmit 2>&1 | head -40
```

Expected: errors only in UnifiedSidebar and DiagramGrid (not yet updated). DashboardPage itself should be clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/dashboard/pages/DashboardPage.tsx
git commit -m "feat(web): convert DashboardPage to layout route with Outlet"
```

---

## Task 4: Rewrite UnifiedSidebar with Internal Navigation

**Files:**
- Modify: `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx`

Key changes:
- Props shrink to 5 callbacks (create/delete actions only — no data, no nav callbacks)
- Fetches `orgs`, `projects`, `diagrams` internally via React Query
- Reads `orgId`, `projectId` from `useParams()`
- Navigates via `useNavigate()`
- Derives `memberManagementActive`/`apiKeysActive` from `useLocation().pathname`

- [ ] **Step 1: Rewrite UnifiedSidebar.tsx**

```tsx
import { useState } from "react";
import type { FocusEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyOrganizations } from "../../../shared/api/organizations.api";
import { listProjects } from "../../../shared/api/projects.api";
import { listDiagrams } from "../../../shared/api/diagrams.api";
import type { DiagramDialect } from "@erdify/domain";
import * as css from "./unified-sidebar.css";

interface UnifiedSidebarProps {
  onCreateOrg: () => void;
  onDeleteOrg: (orgId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onCreateDiagram: () => void;
}

const dialectLabel: Record<DiagramDialect, string> = {
  postgresql: "PG",
  mysql: "MY",
  mariadb: "MA",
  mssql: "MS",
};

export const UnifiedSidebar = ({
  onCreateOrg, onDeleteOrg,
  onCreateProject, onDeleteProject,
  onCreateDiagram,
}: UnifiedSidebarProps) => {
  const navigate = useNavigate();
  const { orgId, projectId } = useParams<{ orgId?: string; projectId?: string }>();
  const { pathname } = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: listMyOrganizations,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => listProjects(orgId!),
    enabled: !!orgId,
  });
  const { data: diagrams = [] } = useQuery({
    queryKey: ["diagrams", projectId],
    queryFn: () => listDiagrams(projectId!),
    enabled: !!projectId,
  });

  const selectedOrg = orgs.find((o) => o.id === orgId) ?? null;
  const memberManagementActive = pathname.endsWith("/members");
  const apiKeysActive = pathname.endsWith("/api-keys");

  const handleSelectOrg = (id: string) => {
    navigate(`/${id}`);
    setDropdownOpen(false);
  };

  const handleSelectProject = (pid: string) => {
    if (pid === projectId) {
      navigate(`/${orgId}`);
    } else {
      navigate(`/${orgId}/${pid}`);
    }
  };

  const handleWrapperBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropdownOpen(false);
  };

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
                    handleSelectOrg(org.id);
                  }}
                >
                  <span className={css.checkMark} aria-hidden="true">
                    {org.id === orgId ? "✓" : ""}
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

      {orgId && (
        <>
          <div className={css.tree}>
            <div className={css.treeSectionLabel}>프로젝트</div>
            {projects.map((project) => {
              const isExpanded = projectId === project.id;
              return (
                <div key={project.id}>
                  <div className={css.projRowWrapper}>
                    <button
                      className={[css.projRow, isExpanded ? css.projRowActive : ""].filter(Boolean).join(" ")}
                      onClick={() => handleSelectProject(project.id)}
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
                      {diagrams.filter((d) => d.projectId === project.id).map((diagram) => (
                        <button
                          key={diagram.id}
                          className={css.erdRow}
                          onClick={() => navigate(`/diagrams/${diagram.id}`)}
                        >
                          <span className={css.erdDot} aria-hidden="true" />
                          <span className={css.erdName}>{diagram.name}</span>
                          <span className={css.erdBadge} aria-hidden="true">
                            {dialectLabel[diagram.content.dialect]}
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
          <div className={[css.treeSectionLabel, css.treeSectionLabelSpaced].join(" ")}>관리</div>
          <button
            className={[css.projRow, memberManagementActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
            onClick={() => navigate(`/${orgId}/members`)}
            aria-pressed={memberManagementActive}
          >
            <span className={css.projArrow} aria-hidden="true" />
            <span className={css.projIcon} aria-hidden="true">👥</span>
            <span className={css.projName}>멤버 관리</span>
          </button>
          <div className={css.sidebarFooter}>
            <button className={css.addProjectBtn} onClick={onCreateProject}>
              + 새 프로젝트
            </button>
          </div>
        </>
      )}

      <div className={css.sidebarBottomBar}>
        <button
          className={[css.projRow, apiKeysActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
          onClick={() => navigate(`/${orgId}/api-keys`)}
          aria-pressed={apiKeysActive}
        >
          <span className={css.projArrow} aria-hidden="true" />
          <span className={css.projIcon} aria-hidden="true">🔑</span>
          <span className={css.projName}>API 키</span>
        </button>
      </div>
    </aside>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/dashboard/components/UnifiedSidebar.tsx
git commit -m "feat(web): UnifiedSidebar — internal navigation via useParams/useNavigate"
```

---

## Task 5: Update DiagramGrid to Use useOutletContext + useParams

**Files:**
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.tsx`

Key changes:
- Remove all props (no longer receives anything from parent)
- Add `useParams` for `orgId`/`projectId`
- Add `useOutletContext<DashboardOutletContext>()` for callbacks + `searchQuery`
- Fetch `diagrams`, `projects` (for project name), `me` (for `currentUserId`) internally
- Keep all rendering logic identical

- [ ] **Step 1: Rewrite DiagramGrid.tsx**

```tsx
import { useState } from "react";
import type { FocusEvent } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreVertical, Share2, Trash2 } from "lucide-react";
import { listDiagrams } from "../../../shared/api/diagrams.api";
import { listProjects } from "../../../shared/api/projects.api";
import { getMe } from "../../../shared/api/auth.api";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";
import type { DashboardOutletContext } from "../pages/DashboardPage";
import { Button, Skeleton } from "../../../design-system";
import {
  mainArea, mainHeader, mainTitle, filterRow, filterChip, filterChipVariants,
  grid, diagramCardWrapper, diagramCard, cardPreview,
  miniTable, miniTableHeader, miniField, cardBody, cardName, cardMeta,
  dialectBadge, newCard, newCardIcon,
  ctxBtn, ctxMenu, ctxItem, ctxItemDanger, ctxDivider,
} from "./DiagramGrid.css";
import { ShareDiagramModal } from "../../editor/components/ShareDiagramModal";

type FilterType = "all" | "recent" | "mine";

const DiagramCardPreview = ({ diagram }: { diagram: DiagramResponse }) => {
  const previewEntities = diagram.content.entities.slice(0, 2);
  if (previewEntities.length === 0) {
    return <div className={cardPreview} />;
  }
  return (
    <div className={cardPreview}>
      {previewEntities.map((entity) => (
        <div key={entity.id} className={miniTable}>
          <div className={miniTableHeader}>{entity.name}</div>
          {entity.columns.slice(0, 3).map((col) => (
            <div key={col.id} className={miniField}>{col.name}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

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

export const DiagramGrid = () => {
  const { orgId, projectId } = useParams<{ orgId: string; projectId?: string }>();
  const { onCreateDiagram, onImportDiagram, onDeleteDiagram, searchQuery } =
    useOutletContext<DashboardOutletContext>();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => listProjects(orgId!),
    enabled: !!orgId,
  });
  const { data: diagrams = [], isLoading } = useQuery({
    queryKey: ["diagrams", projectId],
    queryFn: () => listDiagrams(projectId!),
    enabled: !!projectId,
  });

  const projectName = projects.find((p) => p.id === projectId)?.name;
  const currentUserId = me?.id ?? null;

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareDiagramItem, setShareDiagramItem] = useState<DiagramResponse | null>(null);

  const filtered = applyFilter(diagrams, activeFilter, currentUserId, searchQuery || undefined);

  return (
    <div className={mainArea}>
      <div className={mainHeader}>
        <div className={mainTitle}>{projectName ?? "프로젝트를 선택하세요"}</div>
        {projectName && (
          <Button variant="secondary" size="md" onClick={onImportDiagram}>
            가져오기
          </Button>
        )}
        {projectName && (
          <Button variant="primary" size="md" onClick={onCreateDiagram}>
            + 새 ERD
          </Button>
        )}
      </div>
      {projectName && (
        <div className={filterRow}>
          <button
            className={[filterChip, activeFilter === "all" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            aria-pressed={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          >
            전체
          </button>
          <button
            className={[filterChip, activeFilter === "recent" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            aria-pressed={activeFilter === "recent"}
            onClick={() => setActiveFilter("recent")}
          >
            최근 수정
          </button>
          <button
            className={[filterChip, activeFilter === "mine" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            aria-pressed={activeFilter === "mine"}
            onClick={() => setActiveFilter("mine")}
          >
            내가 만든
          </button>
        </div>
      )}
      {isLoading && !!projectId ? (
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={140} />
          ))}
        </div>
      ) : (
        <div className={grid}>
          {filtered.map((diagram) => (
            <div
              key={diagram.id}
              className={diagramCardWrapper}
              tabIndex={0}
              onBlur={(e: FocusEvent<HTMLDivElement>) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpenId(null);
              }}
            >
              <Link to={`/diagrams/${diagram.id}`} className={diagramCard} aria-label={`${diagram.name} 다이어그램 열기`}>
                <DiagramCardPreview diagram={diagram} />
                <div className={cardBody}>
                  <div className={cardName}>{diagram.name}</div>
                  <div className={cardMeta}>
                    <span className={dialectBadge}>{diagram.content.dialect}</span>
                    {formatDistanceToNow(new Date(diagram.updatedAt), { addSuffix: true, locale: ko })}
                  </div>
                </div>
              </Link>
              <button
                className={ctxBtn}
                aria-label="더보기"
                aria-expanded={menuOpenId === diagram.id}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpenId(menuOpenId === diagram.id ? null : diagram.id);
                }}
              >
                <MoreVertical size={13} aria-hidden="true" />
              </button>
              {menuOpenId === diagram.id && (
                <div className={ctxMenu}>
                  <button
                    className={ctxItem}
                    onClick={() => {
                      setShareDiagramItem(diagram);
                      setMenuOpenId(null);
                    }}
                  >
                    <Share2 size={13} aria-hidden="true" /> 공유하기
                  </button>
                  <div className={ctxDivider} />
                  <button
                    className={ctxItemDanger}
                    onClick={() => {
                      if (window.confirm(`"${diagram.name}" ERD를 삭제하시겠습니까?`)) {
                        onDeleteDiagram(diagram.id);
                      }
                      setMenuOpenId(null);
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" /> 삭제
                  </button>
                </div>
              )}
            </div>
          ))}
          {projectName && (
            <button className={newCard} onClick={onCreateDiagram}>
              <div className={newCardIcon}>+</div>
              새 ERD 만들기
            </button>
          )}
        </div>
      )}
      {shareDiagramItem && (
        <ShareDiagramModal
          open={!!shareDiagramItem}
          diagramId={shareDiagramItem.id}
          initialShareToken={shareDiagramItem.shareToken}
          initialExpiresAt={shareDiagramItem.shareExpiresAt}
          onClose={() => setShareDiagramItem(null)}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/dashboard/components/DiagramGrid.tsx
git commit -m "feat(web): DiagramGrid — self-fetching route component via useParams/useOutletContext"
```

---

## Task 6: Update MemberManagementPage to Use useParams

**Files:**
- Modify: `apps/web/src/features/dashboard/pages/MemberManagementPage.tsx`

Key changes:
- Remove `MemberManagementPageProps` interface
- Add `useParams<{ orgId: string }>()` for `orgId`
- Add `useQuery(["orgs"])` to derive `orgName`
- All other logic unchanged

- [ ] **Step 1: Update MemberManagementPage.tsx**

Replace the top of the file (imports + interface + component signature) as follows. Everything inside the JSX return stays identical.

```tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Skeleton } from "../../../design-system";
import { getMe } from "../../../shared/api/auth.api";
import { listMyOrganizations } from "../../../shared/api/organizations.api";
import { useMembers } from "../hooks/useMembers";
import { useInvites } from "../hooks/useInvites";
import { InviteOrgModal } from "../components/InviteOrgModal";
import * as css from "./member-management-page.css";

export const MemberManagementPage = () => {
  const { orgId = "" } = useParams<{ orgId: string }>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: orgs = [] } = useQuery({ queryKey: ["orgs"], queryFn: listMyOrganizations });
  const orgName = orgs.find((o) => o.id === orgId)?.name ?? "";
  const { members, isLoading: membersLoading, updateRole, removeMember } = useMembers(orgId);
  const { invites, isLoading: invitesLoading, cancelInvite } = useInvites(orgId);

  // ... rest of component body unchanged (myRole, isOwner, formatExpiry, getInitial, return JSX)
```

The complete file with unchanged body:

```tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Skeleton } from "../../../design-system";
import { getMe } from "../../../shared/api/auth.api";
import { listMyOrganizations } from "../../../shared/api/organizations.api";
import { useMembers } from "../hooks/useMembers";
import { useInvites } from "../hooks/useInvites";
import { InviteOrgModal } from "../components/InviteOrgModal";
import * as css from "./member-management-page.css";

export const MemberManagementPage = () => {
  const { orgId = "" } = useParams<{ orgId: string }>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: orgs = [] } = useQuery({ queryKey: ["orgs"], queryFn: listMyOrganizations });
  const orgName = orgs.find((o) => o.id === orgId)?.name ?? "";
  const { members, isLoading: membersLoading, updateRole, removeMember } = useMembers(orgId);
  const { invites, isLoading: invitesLoading, cancelInvite } = useInvites(orgId);

  const myRole = members.find((m) => m.userId === me?.id)?.role ?? null;
  const isOwner = myRole === "owner";

  const formatExpiry = (expiresAt: string): { label: string; expired: boolean } => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return { label: "만료됨", expired: true };
    return { label: `만료: ${days}일 후`, expired: false };
  };

  const getInitial = (email: string): string =>
    (email.split("@")[0]?.[0] ?? "?").toUpperCase();

  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <h1 className={css.title}>멤버 관리</h1>
          <p className={css.subtitle}>{orgName}</p>
        </div>
        {!meLoading && !membersLoading && isOwner && (
          <Button variant="primary" size="md" onClick={() => setInviteOpen(true)}>
            + 멤버 초대
          </Button>
        )}
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>현재 멤버 · {members.length}명</div>
        <div className={css.card}>
          {membersLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={css.memberRow}>
                  <Skeleton width={32} height={32} style={{ borderRadius: "50%" }} />
                  <Skeleton width={180} height={14} />
                </div>
              ))
            : members.map((member) => (
                <div key={member.userId} className={css.memberRow}>
                  <div className={css.avatar}>{getInitial(member.email)}</div>
                  <div className={css.memberInfo}>
                    <div className={css.memberEmail}>
                      {member.email}
                      {member.userId === me?.id && (
                        <span className={css.youBadge}>나</span>
                      )}
                    </div>
                  </div>
                  {!meLoading && isOwner && member.userId !== me?.id ? (
                    <>
                      <select
                        className={css.roleSelect}
                        value={member.role}
                        aria-label={`${member.email} 역할`}
                        onChange={(e) =>
                          updateRole(member.userId, e.target.value as "owner" | "editor" | "viewer")
                        }
                      >
                        <option value="owner">Owner</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`${member.email}을 조직에서 내보내시겠습니까?`)) {
                            removeMember(member.userId);
                          }
                        }}
                      >
                        내보내기
                      </Button>
                    </>
                  ) : (
                    <div className={css.roleBadge}>
                      {member.role === "owner" ? "Owner" : member.role === "editor" ? "Editor" : "Viewer"}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>

      {(invitesLoading || invites.length > 0) && (
        <div className={css.section}>
          <div className={css.sectionLabel}>대기 중인 초대 · {invites.length}개</div>
          <div className={css.card}>
            {invitesLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={css.memberRow}>
                    <Skeleton width={32} height={32} style={{ borderRadius: "50%" }} />
                    <Skeleton width={180} height={14} />
                  </div>
                ))
              : invites.map((invite) => {
                  const { label: expiryLabel, expired: isExpired } = formatExpiry(invite.expiresAt);
                  return (
                    <div key={invite.id} className={css.memberRow}>
                      <div className={css.avatarPending}>✉</div>
                      <div className={css.memberInfo}>
                        <div className={css.memberEmail}>{invite.email}</div>
                        <div className={isExpired ? css.expiryExpired : css.expiry}>
                          {expiryLabel}
                        </div>
                      </div>
                      <div className={css.pendingBadge}>
                        {invite.role === "owner" ? "Owner" : invite.role === "editor" ? "Editor" : "Viewer"} · 대기중
                      </div>
                      {!meLoading && isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInvite(invite.id)}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      <InviteOrgModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        orgId={orgId}
      />
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/dashboard/pages/MemberManagementPage.tsx
git commit -m "feat(web): MemberManagementPage — read orgId from useParams"
```

---

## Task 7: Delete useWorkspaceStore

**Files:**
- Delete: `apps/web/src/shared/stores/useWorkspaceStore.ts`
- Delete: `apps/web/src/shared/stores/useWorkspaceStore.test.ts`

- [ ] **Step 1: Delete both files**

```bash
rm apps/web/src/shared/stores/useWorkspaceStore.ts
rm apps/web/src/shared/stores/useWorkspaceStore.test.ts
```

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "useWorkspaceStore" apps/web/src --include="*.ts" --include="*.tsx"
```

Expected: no output.

- [ ] **Step 3: Run TypeScript check**

```bash
pnpm --filter @erdify/web exec tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @erdify/web test 2>&1
```

Expected: all tests pass (useWorkspaceStore tests are gone, remaining 128 - 5 = 123 tests pass).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): delete useWorkspaceStore — selection state now lives in URL"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Start dev server and verify routes**

```bash
pnpm --filter @erdify/web dev
```

Navigate through each scenario:
1. Go to `/` → redirects to `/:orgId` ✓
2. Click 멤버 관리 → URL becomes `/:orgId/members`, panel changes ✓
3. Click API 키 → URL becomes `/:orgId/api-keys`, panel changes ✓
4. Click a project → URL becomes `/:orgId/:projectId`, DiagramGrid shows ✓
5. Click 멤버 관리, then click a project → dashboard updates correctly ✓
6. Click API 키, then click a project → dashboard updates correctly ✓
7. Browser back button → navigates to previous panel ✓
8. Refresh at `/:orgId/members` → stays on members panel ✓
9. Delete an org → navigates to `/` which redirects to next org ✓
10. Delete a project while viewing it → navigates to `/:orgId` ✓

- [ ] **Step 2: Push to trigger CI/CD**

```bash
git push origin master
```

> **Follow-up (out of scope for this plan):** The spec mentions redirecting when a user accesses `/:orgId` with an orgId that doesn't belong to them, or `/:orgId/:projectId` with a stale projectId. Implementing these requires guard components that check membership and redirect. Add in a separate task after this plan is complete.

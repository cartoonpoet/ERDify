# Dashboard URL-Based Routing

## Problem

Dashboard panel navigation (projects / members / api-keys) is controlled by boolean state flags (`memberManagementOpen`, `apiKeysOpen`). Every new panel requires a new boolean and every handler must reset all other booleans. New-panel-reload loses state, no deep-linking, no browser back/forward.

## URL Structure

```
/                        → redirect to first org (or empty state if no orgs)
/:orgId                  → projects view (DiagramGrid)
/:orgId/members          → member management panel
/:orgId/api-keys         → API keys panel
/:orgId/:projectId       → diagrams view (DiagramGrid filtered by project)
/diagrams/:diagramId     → diagram editor (unchanged)
/login                   → login (unchanged)
/register                → register (unchanged)
/share/:shareToken       → shared diagram (unchanged)
```

Static segments (`members`, `api-keys`) are registered before the dynamic `:projectId` segment so React Router matches them first — no collision with UUID project IDs.

## Architecture

### Router.tsx

Replace the current `/*` catch-all with nested routes under `/:orgId`:

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<Navigate to first org or empty dashboard />} />
  <Route path="/:orgId" element={<DashboardPage />}>
    <Route index element={<DiagramGrid />} />
    <Route path="members" element={<MemberManagementPage />} />
    <Route path="api-keys" element={<ApiKeysPanel />} />
    <Route path=":projectId" element={<DiagramGrid />} />
  </Route>
  <Route path="/diagrams/:diagramId" element={<DiagramEditorPage />} />
</Route>
```

### DashboardPage

Becomes a layout component — owns the shell (sidebar + topbar) and renders `<Outlet />` in the content area.

Removed:
- `memberManagementOpen`, `apiKeysOpen` state
- Conditional panel rendering (`apiKeysOpen ? ... : memberManagementOpen ? ... : ...`)
- `handleApiKeys`, `handleSelectOrg`, `handleSelectProject` as state-setters

Navigation handlers become `navigate()` calls:
- org 선택 → `navigate('/:orgId')`
- project 선택 → `navigate('/:orgId/:projectId')`
- members → `navigate('/:orgId/members')`
- api-keys → `navigate('/:orgId/api-keys')`

### useWorkspaceStore (Zustand)

Remove `selectedOrganizationId` and `selectedProjectId` — these are now derived from `useParams()` at the component level.

Remaining store responsibilities: nothing workspace-selection-related. If the store becomes empty after removal, delete it entirely.

### UnifiedSidebar

Switch from props-based callbacks to internal `useNavigate` + `useParams`. Props `onSelectOrg`, `onSelectProject`, `onManageMembers`, `onApiKeys` are removed. Sidebar reads current org/project from URL params to highlight active items.

### Panel Components

`DiagramGrid`, `MemberManagementPage`, `ApiKeysPanel` read `orgId` / `projectId` from `useParams()` instead of receiving them as props or reading from Zustand.

## Redirect Logic

`/` renders a redirect component that:
1. Reads the user's org list
2. If orgs exist → `navigate('/:firstOrgId', { replace: true })`
3. If no orgs → shows org creation prompt (existing empty state UI)

## Error Handling

- `/:orgId` where orgId doesn't belong to user → redirect to `/`
- `/:orgId/:projectId` where projectId doesn't belong to org → redirect to `/:orgId`
- `/:orgId/members` with no org selected (shouldn't happen via UI) → redirect to `/`

## What Does NOT Change

- `/diagrams/:diagramId` editor route and its internals
- Modal states (`orgModalOpen`, `projectModalOpen`, `diagramModalOpen`, `importModalOpen`, `profileModalOpen`)
- React Query data fetching logic
- All mutation handlers (delete org, delete project, delete diagram)
- Auth flow

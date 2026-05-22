# Feature-Based Folder Restructure Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `apps/web/src/` from role-based flat structure into feature-based structure with a `shared/` layer, so that changing a feature touches one directory instead of four.

**Architecture:** Files that change together live together. Three features (`editor`, `dashboard`, `auth`) each own their `components/`, `hooks/`, `store/`, and `pages/`. Cross-feature pieces (`Button`, `ShareDiagramModal`, `UpdateBanner`, API layer, utils) live in `shared/`. The `@/` Vite alias continues to point at `src/` — only the path segments after `@/` change.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, TanStack Query, vanilla-extract, Vitest, React Router v6

---

## Final Directory Structure

```
apps/web/src/
├── features/
│   ├── editor/
│   │   ├── components/   EditorCanvas, EditableTableNode/, CardinalityEdge,
│   │   │                 RelationshipPopover, VersionHistoryDrawer,
│   │   │                 VersionHistoryDrawerSkeleton, McpActivityDrawer,
│   │   │                 FkSetupModal, RelDeleteConfirmModal, SchemaFilterSidebar,
│   │   │                 ImportIntoEditorModal, SearchPanel, CanvasContextMenu,
│   │   │                 PresenceIndicator, DarkCodeEditor, ExportModal, InviteModal
│   │   ├── hooks/        useRealtimeCollaboration, useDiagramAutosave,
│   │   │                 useCollaborationSocket, usePresence, useMcpActivity,
│   │   │                 useVersionHistory, useVersionPolling, useDiagramImport
│   │   ├── store/        useEditorStore, diagramSlice, uiSlice, collaboratorsSlice,
│   │   │                 pendingSlice, editor-store.types, editor-store.helpers
│   │   └── pages/        EditorPage, EditorPageSkeleton
│   ├── dashboard/
│   │   ├── components/   DiagramGrid, UnifiedSidebar/, CreateOrgModal, CreateProjectModal,
│   │   │                 CreateDiagramModal, ImportDiagramModal, EditDiagramModal,
│   │   │                 InviteOrgModal, ProfileModal, UpdateBanner (+ modal-form.css.ts)
│   │   ├── hooks/        useDashboardActions, useAvatarMenu, useMembers, useInvites
│   │   ├── store/        useDashboardStore
│   │   └── pages/        DashboardPage, MemberManagementPage, ApiKeysPanel
│   └── auth/
│       └── pages/        LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
├── shared/
│   ├── api/              httpClient, auth.api, diagrams.api, organizations.api,
│   │                     projects.api, members.api, api-keys.api, mcp-sessions.api
│   ├── components/       Button/, Card/, Input/, Modal/, Skeleton/,
│   │                     QueryErrorBoundary, ShareDiagramModal, UpdateBanner
│   ├── store/            useAuthStore
│   └── utils/            uuid, clipboard, canvas-layout, schema-colors,
│                         ddl-parser, ddl-generator, exerd-parser, collaboration-diff
├── pages/                RootRedirect, NotFoundPage, SharedDiagramPage  (no feature home)
├── router/               (unchanged)
├── style/                (unchanged)
└── main.tsx              (unchanged)
```

**Decisions:**
- `ShareDiagramModal` → `shared/components/` (used by both EditorPage and DiagramGrid)
- `UpdateBanner` → `shared/components/` (used by `router/AppProviders.tsx`)
- `modal-form.css.ts` → `features/dashboard/components/` (only dashboard modals use it, all via relative `./modal-form.css` — stays co-located)
- `auth-page.css.ts` → `features/auth/pages/` (shared by all auth page layouts)
- `style/` stays at `src/style/` (foundational tokens, not feature-specific)

---

## Important: Relative Import Edge Cases

Two files use `../utils/` relative imports that will break when the file moves to a feature subfolder. Fix both in Task 3:

1. `src/components/CanvasContextMenu.tsx` line 6: `from "../utils/canvas-layout"` → `from "@/shared/utils/canvas-layout"`
2. `src/hooks/useRealtimeCollaboration.ts` line 7: `from "../utils/collaboration-diff"` → `from "@/shared/utils/collaboration-diff"`

---

### Task 1: Move `api/` and `utils/` to `shared/`

**Files:**
- Move: `src/api/*` → `src/shared/api/*` (8 source files + 8 test files)
- Move: `src/utils/*` → `src/shared/utils/*` (8 source files + 4 test files + test-data/)
- Modify: every `.ts/.tsx` under `src/` that imports `@/api/` or `@/utils/`

- [ ] **Step 1: Create directories**
```bash
cd apps/web/src
mkdir -p shared/api shared/utils
```

- [ ] **Step 2: Move api files**
```bash
cd apps/web/src
git mv api/api-keys.api.ts shared/api/api-keys.api.ts
git mv api/api-keys.api.test.ts shared/api/api-keys.api.test.ts
git mv api/auth.api.ts shared/api/auth.api.ts
git mv api/auth.api.test.ts shared/api/auth.api.test.ts
git mv api/diagrams.api.ts shared/api/diagrams.api.ts
git mv api/diagrams.api.test.ts shared/api/diagrams.api.test.ts
git mv api/httpClient.ts shared/api/httpClient.ts
git mv api/httpClient.interceptor.test.ts shared/api/httpClient.interceptor.test.ts
git mv api/mcp-sessions.api.ts shared/api/mcp-sessions.api.ts
git mv api/mcp-sessions.api.test.ts shared/api/mcp-sessions.api.test.ts
git mv api/members.api.ts shared/api/members.api.ts
git mv api/members.api.test.ts shared/api/members.api.test.ts
git mv api/organizations.api.ts shared/api/organizations.api.ts
git mv api/organizations.api.test.ts shared/api/organizations.api.test.ts
git mv api/projects.api.ts shared/api/projects.api.ts
git mv api/projects.api.test.ts shared/api/projects.api.test.ts
rmdir api
```

- [ ] **Step 3: Move utils files**
```bash
cd apps/web/src
git mv utils/canvas-layout.ts shared/utils/canvas-layout.ts
git mv utils/clipboard.ts shared/utils/clipboard.ts
git mv utils/clipboard.test.ts shared/utils/clipboard.test.ts
git mv utils/collaboration-diff.ts shared/utils/collaboration-diff.ts
git mv utils/ddl-generator.ts shared/utils/ddl-generator.ts
git mv utils/ddl-parser.ts shared/utils/ddl-parser.ts
git mv utils/ddl-parser.test.ts shared/utils/ddl-parser.test.ts
git mv utils/exerd-parser.ts shared/utils/exerd-parser.ts
git mv utils/exerd-parser.test.ts shared/utils/exerd-parser.test.ts
git mv utils/schema-colors.ts shared/utils/schema-colors.ts
git mv utils/uuid.ts shared/utils/uuid.ts
git mv utils/test-data shared/utils/test-data
rmdir utils
```

- [ ] **Step 4: Update `@/api/` imports across the entire codebase**
```bash
cd apps/web
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/api/|from "@/shared/api/|g'
```
Verify: `grep -r 'from "@/api/' src` should return empty.

- [ ] **Step 5: Update `@/utils/` imports across the entire codebase**
```bash
cd apps/web
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/utils/|from "@/shared/utils/|g'
```
Verify: `grep -r 'from "@/utils/' src` should return empty.

- [ ] **Step 6: TypeScript check**
```bash
cd apps/web
pnpm tsc --noEmit 2>&1 | grep "error TS" | head -20
```
Expected: 0 errors (or same count as before).

- [ ] **Step 7: Run tests**
```bash
cd apps/web
pnpm test --run 2>&1 | tail -5
```
Expected: 255 passed, 0 failed.

- [ ] **Step 8: Commit**
```bash
git add -A apps/web/src/shared/api apps/web/src/shared/utils
git add -u apps/web/src
git commit -m "refactor(web): move api/ and utils/ into shared/"
```

---

### Task 2: Move shared UI components and `useAuthStore`

**Files:**
- Move: `src/components/{Button,Card,Input,Modal,Skeleton}/` → `src/shared/components/`
- Move: `src/components/QueryErrorBoundary.*` → `src/shared/components/`
- Move: `src/components/ShareDiagramModal.*` → `src/shared/components/`
- Move: `src/components/UpdateBanner.*` → `src/shared/components/`
- Move: `src/store/useAuthStore.*` → `src/shared/store/`
- Update: `src/components/index.ts` barrel to point at new shared paths

- [ ] **Step 1: Create directories**
```bash
cd apps/web/src
mkdir -p shared/components shared/store
```

- [ ] **Step 2: Move shared UI component directories**
```bash
cd apps/web/src
git mv components/Button shared/components/Button
git mv components/Card shared/components/Card
git mv components/Input shared/components/Input
git mv components/Modal shared/components/Modal
git mv components/Skeleton shared/components/Skeleton
```

- [ ] **Step 3: Move cross-feature and router-level components**
```bash
cd apps/web/src
git mv components/QueryErrorBoundary.tsx shared/components/QueryErrorBoundary.tsx
git mv components/query-error-boundary.css.ts shared/components/query-error-boundary.css.ts
git mv components/QueryErrorBoundary.test.tsx shared/components/QueryErrorBoundary.test.tsx
git mv components/ShareDiagramModal.tsx shared/components/ShareDiagramModal.tsx
git mv components/ShareDiagramModal.test.tsx shared/components/ShareDiagramModal.test.tsx
git mv components/share-diagram-modal.css.ts shared/components/share-diagram-modal.css.ts
git mv components/UpdateBanner.tsx shared/components/UpdateBanner.tsx
git mv components/UpdateBanner.css.ts shared/components/UpdateBanner.css.ts
```

- [ ] **Step 4: Move useAuthStore**
```bash
cd apps/web/src
git mv store/useAuthStore.ts shared/store/useAuthStore.ts
git mv store/useAuthStore.test.ts shared/store/useAuthStore.test.ts
```

- [ ] **Step 5: Update `src/components/index.ts` barrel**

Replace the entire file `apps/web/src/components/index.ts` with:
```ts
export { Button } from "@/shared/components/Button";
export { Input } from "@/shared/components/Input";
export { Card } from "@/shared/components/Card";
export { Skeleton } from "@/shared/components/Skeleton";
export { Modal } from "@/shared/components/Modal";
export { vars } from "@/style/tokens.css";
```

- [ ] **Step 6: Update direct imports of moved components**
```bash
cd apps/web
# Shared UI primitives (direct, not via barrel)
for comp in Button Card Input Modal Skeleton; do
  find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|from \"@/components/${comp}\"|from \"@/shared/components/${comp}\"|g"
  find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|from \"../components/${comp}\"|from \"@/shared/components/${comp}\"|g"
done

# QueryErrorBoundary
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/components/QueryErrorBoundary"|from "@/shared/components/QueryErrorBoundary"|g'

# ShareDiagramModal (absolute imports from dashboard side)
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/components/ShareDiagramModal"|from "@/shared/components/ShareDiagramModal"|g'

# ShareDiagramModal (relative import from EditorPage: ../components/ShareDiagramModal)
# EditorPage hasn't moved yet, so ../components/ShareDiagramModal still resolves correctly for now.
# It will be updated in Task 3 when EditorPage moves.

# UpdateBanner (used by router/AppProviders)
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/components/UpdateBanner"|from "@/shared/components/UpdateBanner"|g'
```

- [ ] **Step 7: Update `@/store/useAuthStore` imports**
```bash
cd apps/web
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/useAuthStore"|from "@/shared/store/useAuthStore"|g'
```

- [ ] **Step 8: TypeScript check**
```bash
cd apps/web
pnpm tsc --noEmit 2>&1 | grep "error TS" | head -20
```
Expected: 0 errors.

- [ ] **Step 9: Run tests**
```bash
cd apps/web
pnpm test --run 2>&1 | tail -5
```
Expected: 255 passed, 0 failed.

- [ ] **Step 10: Commit**
```bash
git add -A apps/web/src/shared/components apps/web/src/shared/store
git add -u apps/web/src
git commit -m "refactor(web): move shared UI components and useAuthStore into shared/"
```

---

### Task 3: Move `features/editor/`

Editor-specific assets to move:
- **Store:** `useEditorStore`, `diagramSlice`, `uiSlice`, `collaboratorsSlice`, `pendingSlice`, `editor-store.types`, `editor-store.helpers`
- **Hooks:** `useRealtimeCollaboration`, `useDiagramAutosave`, `useCollaborationSocket`, `usePresence`, `useMcpActivity`, `useVersionHistory`, `useVersionPolling`, `useDiagramImport`
- **Components:** `CanvasContextMenu`, `CardinalityEdge`, `DarkCodeEditor`, `EditorCanvas`, `EditableTableNode/`, `ExportModal`, `FkSetupModal`, `ImportIntoEditorModal`, `InviteModal`, `McpActivityDrawer`, `PresenceIndicator`, `RelDeleteConfirmModal`, `RelationshipPopover`, `SchemaFilterSidebar`, `SearchPanel`, `VersionHistoryDrawer`, `VersionHistoryDrawerSkeleton`
- **Pages:** `EditorPage`, `EditorPageSkeleton`

- [ ] **Step 1: Create feature directories**
```bash
cd apps/web/src
mkdir -p features/editor/store features/editor/hooks features/editor/components features/editor/pages
```

- [ ] **Step 2: Move editor store (all 8 files + test)**
```bash
cd apps/web/src
git mv store/diagramSlice.ts features/editor/store/diagramSlice.ts
git mv store/uiSlice.ts features/editor/store/uiSlice.ts
git mv store/collaboratorsSlice.ts features/editor/store/collaboratorsSlice.ts
git mv store/pendingSlice.ts features/editor/store/pendingSlice.ts
git mv store/editor-store.types.ts features/editor/store/editor-store.types.ts
git mv store/editor-store.helpers.ts features/editor/store/editor-store.helpers.ts
git mv store/useEditorStore.ts features/editor/store/useEditorStore.ts
git mv store/useEditorStore.test.ts features/editor/store/useEditorStore.test.ts
```

- [ ] **Step 3: Move editor hooks (+ tests)**
```bash
cd apps/web/src
git mv hooks/useRealtimeCollaboration.ts features/editor/hooks/useRealtimeCollaboration.ts
git mv hooks/useRealtimeCollaboration.test.tsx features/editor/hooks/useRealtimeCollaboration.test.tsx
git mv hooks/useDiagramAutosave.ts features/editor/hooks/useDiagramAutosave.ts
git mv hooks/useDiagramAutosave.test.ts features/editor/hooks/useDiagramAutosave.test.ts
git mv hooks/useCollaborationSocket.ts features/editor/hooks/useCollaborationSocket.ts
git mv hooks/usePresence.ts features/editor/hooks/usePresence.ts
git mv hooks/useMcpActivity.ts features/editor/hooks/useMcpActivity.ts
git mv hooks/useMcpActivity.test.ts features/editor/hooks/useMcpActivity.test.ts
git mv hooks/useVersionHistory.ts features/editor/hooks/useVersionHistory.ts
git mv hooks/useVersionHistory.test.tsx features/editor/hooks/useVersionHistory.test.tsx
git mv hooks/useVersionPolling.ts features/editor/hooks/useVersionPolling.ts
git mv hooks/useDiagramImport.ts features/editor/hooks/useDiagramImport.ts
```

- [ ] **Step 4: Move editor components (+ CSS + tests)**
```bash
cd apps/web/src
git mv components/CanvasContextMenu.tsx features/editor/components/CanvasContextMenu.tsx
git mv components/CardinalityEdge.tsx features/editor/components/CardinalityEdge.tsx
git mv components/DarkCodeEditor.tsx features/editor/components/DarkCodeEditor.tsx
git mv components/DarkCodeEditor.css.ts features/editor/components/DarkCodeEditor.css.ts
git mv components/DarkCodeEditor.test.tsx features/editor/components/DarkCodeEditor.test.tsx
git mv components/EditorCanvas.tsx features/editor/components/EditorCanvas.tsx
git mv components/EditableTableNode features/editor/components/EditableTableNode
git mv components/ExportModal.tsx features/editor/components/ExportModal.tsx
git mv components/ExportModal.css.ts features/editor/components/ExportModal.css.ts
git mv components/ExportModal.test.tsx features/editor/components/ExportModal.test.tsx
git mv components/FkSetupModal.tsx features/editor/components/FkSetupModal.tsx
git mv components/fk-setup-modal.css.ts features/editor/components/fk-setup-modal.css.ts
git mv components/ImportIntoEditorModal.tsx features/editor/components/ImportIntoEditorModal.tsx
git mv components/InviteModal.tsx features/editor/components/InviteModal.tsx
git mv components/invite-modal.css.ts features/editor/components/invite-modal.css.ts
git mv components/InviteModal.test.tsx features/editor/components/InviteModal.test.tsx
git mv components/McpActivityDrawer.tsx features/editor/components/McpActivityDrawer.tsx
git mv components/mcp-activity-drawer.css.ts features/editor/components/mcp-activity-drawer.css.ts
git mv components/McpActivityDrawer.test.tsx features/editor/components/McpActivityDrawer.test.tsx
git mv components/PresenceIndicator.tsx features/editor/components/PresenceIndicator.tsx
git mv components/presence-indicator.css.ts features/editor/components/presence-indicator.css.ts
git mv components/PresenceIndicator.test.tsx features/editor/components/PresenceIndicator.test.tsx
git mv components/RelDeleteConfirmModal.tsx features/editor/components/RelDeleteConfirmModal.tsx
git mv components/RelDeleteConfirmModal.test.tsx features/editor/components/RelDeleteConfirmModal.test.tsx
git mv components/RelationshipPopover.tsx features/editor/components/RelationshipPopover.tsx
git mv components/RelationshipPopover.test.tsx features/editor/components/RelationshipPopover.test.tsx
git mv components/relationship-popover.css.ts features/editor/components/relationship-popover.css.ts
git mv components/SchemaFilterSidebar.tsx features/editor/components/SchemaFilterSidebar.tsx
git mv components/SearchPanel.tsx features/editor/components/SearchPanel.tsx
git mv components/SearchPanel.test.tsx features/editor/components/SearchPanel.test.tsx
git mv components/search-panel.css.ts features/editor/components/search-panel.css.ts
git mv components/VersionHistoryDrawer.tsx features/editor/components/VersionHistoryDrawer.tsx
git mv components/VersionHistoryDrawer.test.tsx features/editor/components/VersionHistoryDrawer.test.tsx
git mv components/version-history-drawer.css.ts features/editor/components/version-history-drawer.css.ts
git mv components/VersionHistoryDrawerSkeleton.tsx features/editor/components/VersionHistoryDrawerSkeleton.tsx
```

- [ ] **Step 5: Move editor pages**
```bash
cd apps/web/src
git mv pages/EditorPage.tsx features/editor/pages/EditorPage.tsx
git mv pages/EditorPageSkeleton.tsx features/editor/pages/EditorPageSkeleton.tsx
git mv pages/editor-page.css.ts features/editor/pages/editor-page.css.ts
```

- [ ] **Step 6: Fix the two known broken relative imports in moved files**

In `features/editor/components/CanvasContextMenu.tsx`, update line 6:
```
from "../utils/canvas-layout"
```
→
```
from "@/shared/utils/canvas-layout"
```

In `features/editor/hooks/useRealtimeCollaboration.ts`, update line 7:
```
from "../utils/collaboration-diff"
```
→
```
from "@/shared/utils/collaboration-diff"
```

- [ ] **Step 7: Update `@/store/useEditorStore` and editor store imports everywhere**
```bash
cd apps/web
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/useEditorStore"|from "@/features/editor/store/useEditorStore"|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/diagramSlice"|from "@/features/editor/store/diagramSlice"|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/uiSlice"|from "@/features/editor/store/uiSlice"|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/collaboratorsSlice"|from "@/features/editor/store/collaboratorsSlice"|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/pendingSlice"|from "@/features/editor/store/pendingSlice"|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/editor-store.types"|from "@/features/editor/store/editor-store.types"|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/editor-store.helpers"|from "@/features/editor/store/editor-store.helpers"|g'
```

- [ ] **Step 8: Update `@/hooks/` imports for editor hooks**
```bash
cd apps/web
for hook in useRealtimeCollaboration useDiagramAutosave useCollaborationSocket usePresence useMcpActivity useVersionHistory useVersionPolling useDiagramImport; do
  find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|from \"@/hooks/${hook}\"|from \"@/features/editor/hooks/${hook}\"|g"
done
```

- [ ] **Step 9: Update `@/components/` imports for editor-specific components**
```bash
cd apps/web
for comp in CanvasContextMenu CardinalityEdge DarkCodeEditor EditorCanvas ExportModal FkSetupModal ImportIntoEditorModal InviteModal McpActivityDrawer PresenceIndicator RelDeleteConfirmModal RelationshipPopover SchemaFilterSidebar SearchPanel VersionHistoryDrawer VersionHistoryDrawerSkeleton; do
  find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|from \"@/components/${comp}\"|from \"@/features/editor/components/${comp}\"|g"
done
```

- [ ] **Step 10: Update router's dynamic import paths for EditorPage**
```bash
cd apps/web
find src -name "*.tsx" | xargs sed -i '' 's|"@/pages/EditorPage"|"@/features/editor/pages/EditorPage"|g'
```

- [ ] **Step 11: Fix EditorPage's relative imports for ShareDiagramModal**

EditorPage moved to `features/editor/pages/EditorPage.tsx`. It still has `from "../components/ShareDiagramModal"` which now resolves to `features/editor/components/ShareDiagramModal` — but ShareDiagramModal went to `shared/`. Fix it:

In `apps/web/src/features/editor/pages/EditorPage.tsx`, change:
```ts
import { ShareDiagramModal } from "../components/ShareDiagramModal";
```
→
```ts
import { ShareDiagramModal } from "@/shared/components/ShareDiagramModal";
```

- [ ] **Step 12: TypeScript check**
```bash
cd apps/web
pnpm tsc --noEmit 2>&1 | grep "error TS" | head -30
```
Fix any remaining errors — they will be additional relative import issues. For each error, change the broken relative import to an absolute `@/` path.

- [ ] **Step 13: Run tests**
```bash
cd apps/web
pnpm test --run 2>&1 | tail -5
```
Expected: 255 passed, 0 failed.

- [ ] **Step 14: Commit**
```bash
git add -A apps/web/src/features/editor
git add -u apps/web/src
git commit -m "refactor(web): move editor feature into features/editor/"
```

---

### Task 4: Move `features/dashboard/`

Dashboard assets to move:
- **Store:** `useDashboardStore`
- **Hooks:** `useDashboardActions`, `useAvatarMenu`, `useMembers`, `useInvites`
- **Components:** `DiagramGrid`, `UnifiedSidebar/`, `CreateOrgModal`, `CreateProjectModal`, `CreateDiagramModal`, `ImportDiagramModal`, `EditDiagramModal`, `InviteOrgModal`, `ProfileModal` + `modal-form.css.ts`
- **Pages:** `DashboardPage`, `MemberManagementPage`, `ApiKeysPanel`

- [ ] **Step 1: Create feature directories**
```bash
cd apps/web/src
mkdir -p features/dashboard/store features/dashboard/hooks features/dashboard/components features/dashboard/pages
```

- [ ] **Step 2: Move dashboard store**
```bash
cd apps/web/src
git mv store/useDashboardStore.ts features/dashboard/store/useDashboardStore.ts
```

- [ ] **Step 3: Move dashboard hooks**
```bash
cd apps/web/src
git mv hooks/useDashboardActions.ts features/dashboard/hooks/useDashboardActions.ts
git mv hooks/useAvatarMenu.ts features/dashboard/hooks/useAvatarMenu.ts
git mv hooks/useMembers.ts features/dashboard/hooks/useMembers.ts
git mv hooks/useInvites.ts features/dashboard/hooks/useInvites.ts
```

- [ ] **Step 4: Move dashboard components (+ CSS + tests)**
```bash
cd apps/web/src
git mv components/DiagramGrid.tsx features/dashboard/components/DiagramGrid.tsx
git mv components/DiagramGrid.css.ts features/dashboard/components/DiagramGrid.css.ts
git mv components/DiagramGrid.test.tsx features/dashboard/components/DiagramGrid.test.tsx
git mv components/UnifiedSidebar features/dashboard/components/UnifiedSidebar
git mv components/CreateOrgModal.tsx features/dashboard/components/CreateOrgModal.tsx
git mv components/CreateOrgModal.test.tsx features/dashboard/components/CreateOrgModal.test.tsx
git mv components/CreateProjectModal.tsx features/dashboard/components/CreateProjectModal.tsx
git mv components/CreateProjectModal.test.tsx features/dashboard/components/CreateProjectModal.test.tsx
git mv components/CreateDiagramModal.tsx features/dashboard/components/CreateDiagramModal.tsx
git mv components/CreateDiagramModal.test.tsx features/dashboard/components/CreateDiagramModal.test.tsx
git mv components/ImportDiagramModal.tsx features/dashboard/components/ImportDiagramModal.tsx
git mv components/ImportDiagramModal.css.ts features/dashboard/components/ImportDiagramModal.css.ts
git mv components/EditDiagramModal.tsx features/dashboard/components/EditDiagramModal.tsx
git mv components/InviteOrgModal.tsx features/dashboard/components/InviteOrgModal.tsx
git mv components/InviteOrgModal.test.tsx features/dashboard/components/InviteOrgModal.test.tsx
git mv components/invite-org-modal.css.ts features/dashboard/components/invite-org-modal.css.ts
git mv components/ProfileModal.tsx features/dashboard/components/ProfileModal.tsx
git mv components/ProfileModal.test.tsx features/dashboard/components/ProfileModal.test.tsx
git mv components/ProfileModal.css.ts features/dashboard/components/ProfileModal.css.ts
git mv components/modal-form.css.ts features/dashboard/components/modal-form.css.ts
```

Note: `modal-form.css.ts` is imported via relative `./modal-form.css` by all the above modals. Since they all move to the same directory, the relative import stays valid — no import change needed for this CSS file.

- [ ] **Step 5: Move dashboard pages (+ CSS + tests)**
```bash
cd apps/web/src
git mv pages/DashboardPage.tsx features/dashboard/pages/DashboardPage.tsx
git mv pages/dashboard-page.css.ts features/dashboard/pages/dashboard-page.css.ts
git mv pages/MemberManagementPage.tsx features/dashboard/pages/MemberManagementPage.tsx
git mv pages/MemberManagementPage.test.tsx features/dashboard/pages/MemberManagementPage.test.tsx
git mv pages/member-management-page.css.ts features/dashboard/pages/member-management-page.css.ts
git mv pages/ApiKeysPanel.tsx features/dashboard/pages/ApiKeysPanel.tsx
git mv pages/ApiKeysPanel.test.tsx features/dashboard/pages/ApiKeysPanel.test.tsx
git mv pages/api-keys-panel.css.ts features/dashboard/pages/api-keys-panel.css.ts
```

- [ ] **Step 6: Update dashboard store import**
```bash
cd apps/web
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/store/useDashboardStore"|from "@/features/dashboard/store/useDashboardStore"|g'
```

- [ ] **Step 7: Update dashboard hooks imports**
```bash
cd apps/web
for hook in useDashboardActions useAvatarMenu useMembers useInvites; do
  find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|from \"@/hooks/${hook}\"|from \"@/features/dashboard/hooks/${hook}\"|g"
done
```

- [ ] **Step 8: Update dashboard component imports**
```bash
cd apps/web
for comp in DiagramGrid CreateOrgModal CreateProjectModal CreateDiagramModal ImportDiagramModal EditDiagramModal InviteOrgModal ProfileModal; do
  find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|from \"@/components/${comp}\"|from \"@/features/dashboard/components/${comp}\"|g"
done
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|from "@/components/UnifiedSidebar"|from "@/features/dashboard/components/UnifiedSidebar"|g'
```

- [ ] **Step 9: Update router's dynamic import paths for dashboard pages**
```bash
cd apps/web
find src -name "*.tsx" | xargs sed -i '' 's|"@/pages/DashboardPage"|"@/features/dashboard/pages/DashboardPage"|g'
find src -name "*.tsx" | xargs sed -i '' 's|"@/pages/MemberManagementPage"|"@/features/dashboard/pages/MemberManagementPage"|g'
find src -name "*.tsx" | xargs sed -i '' 's|"@/pages/ApiKeysPanel"|"@/features/dashboard/pages/ApiKeysPanel"|g'
```

- [ ] **Step 10: Update cross-imports (DiagramGrid ↔ DashboardPage)**

`DiagramGrid.tsx` imports the `DashboardOutletContext` type from `DashboardPage` via relative `../pages/DashboardPage`. After the move, both are in `features/dashboard/` — the relative path `../pages/DashboardPage` resolves to `features/dashboard/pages/DashboardPage` ✅. No change needed.

`DashboardPage.tsx` imports its modals via relative `../components/CreateOrgModal`. After the move, the relative path `../components/CreateOrgModal` resolves to `features/dashboard/components/CreateOrgModal` ✅. No change needed.

- [ ] **Step 11: TypeScript check**
```bash
cd apps/web
pnpm tsc --noEmit 2>&1 | grep "error TS" | head -30
```
Fix any errors — typically broken relative imports that cross feature boundaries.

- [ ] **Step 12: Run tests**
```bash
cd apps/web
pnpm test --run 2>&1 | tail -5
```
Expected: 255 passed, 0 failed.

- [ ] **Step 13: Commit**
```bash
git add -A apps/web/src/features/dashboard
git add -u apps/web/src
git commit -m "refactor(web): move dashboard feature into features/dashboard/"
```

---

### Task 5: Move `features/auth/` and cleanup

Auth pages to move: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `auth-page.css.ts`

Remaining in `src/pages/` (no feature home): `RootRedirect`, `NotFoundPage`, `SharedDiagramPage`

- [ ] **Step 1: Create auth pages directory**
```bash
cd apps/web/src
mkdir -p features/auth/pages
```

- [ ] **Step 2: Move auth pages**
```bash
cd apps/web/src
git mv pages/LoginPage.tsx features/auth/pages/LoginPage.tsx
git mv pages/LoginPage.test.tsx features/auth/pages/LoginPage.test.tsx
git mv pages/RegisterPage.tsx features/auth/pages/RegisterPage.tsx
git mv pages/RegisterPage.test.tsx features/auth/pages/RegisterPage.test.tsx
git mv pages/ForgotPasswordPage.tsx features/auth/pages/ForgotPasswordPage.tsx
git mv pages/ResetPasswordPage.tsx features/auth/pages/ResetPasswordPage.tsx
git mv pages/auth-page.css.ts features/auth/pages/auth-page.css.ts
```

`auth-page.css.ts` is imported via relative `./auth-page.css` in each auth page. Since all auth pages move together to the same directory, the relative import still works ✅.

- [ ] **Step 3: Update router's dynamic import paths for auth pages**
```bash
cd apps/web
find src -name "*.tsx" | xargs sed -i '' 's|"@/pages/LoginPage"|"@/features/auth/pages/LoginPage"|g'
find src -name "*.tsx" | xargs sed -i '' 's|"@/pages/RegisterPage"|"@/features/auth/pages/RegisterPage"|g'
find src -name "*.tsx" | xargs sed -i '' 's|"@/pages/ForgotPasswordPage"|"@/features/auth/pages/ForgotPasswordPage"|g'
find src -name "*.tsx" | xargs sed -i '' 's|"@/pages/ResetPasswordPage"|"@/features/auth/pages/ResetPasswordPage"|g'
```

- [ ] **Step 4: Verify `src/pages/` only has non-feature pages left**
```bash
ls apps/web/src/pages/
```
Expected: `RootRedirect.tsx`, `RootRedirect.test.tsx`, `NotFoundPage.tsx`, `NotFoundPage.test.tsx`, `not-found-page.css.ts`, `SharedDiagramPage.tsx`, `SharedDiagramPage.test.tsx`, `shared-diagram-page.css.ts`

- [ ] **Step 5: Verify `src/hooks/` and `src/store/` are empty, then remove**
```bash
ls apps/web/src/hooks/ 2>/dev/null && echo "hooks not empty" || rmdir apps/web/src/hooks
ls apps/web/src/store/ 2>/dev/null && echo "store not empty" || rmdir apps/web/src/store
```
If they're not empty, investigate which files remain and move them to the appropriate location.

- [ ] **Step 6: TypeScript check — full codebase**
```bash
cd apps/web
pnpm tsc --noEmit 2>&1 | grep "error TS"
```
Expected: 0 errors. If there are errors, fix broken imports before proceeding.

- [ ] **Step 7: Run full test suite**
```bash
cd apps/web
pnpm test --run
```
Expected: 255 passed, 0 failed.

- [ ] **Step 8: Verify Vite build succeeds**
```bash
cd apps/web
pnpm build 2>&1 | tail -10
```
Expected: build completes without errors.

- [ ] **Step 9: Commit**
```bash
git add -A apps/web/src/features/auth
git add -u apps/web/src
git commit -m "refactor(web): move auth pages and complete feature-based restructure"
```

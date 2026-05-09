# Frontend Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** apps/web 프론트엔드 코드베이스를 Bottom-up으로 리팩토링 — 타입 체계화 → 훅 SRP → 컴포넌트 분리.

**Architecture:** packages/contracts에 API 응답 타입을 중앙화하고, useRealtimeCollaboration을 3개 단위로 쪼개며, useEditorStore를 Zustand 슬라이스 패턴으로 분리. 컴포넌트는 폴더 단위로 서브컴포넌트화하되 외부 import 경로를 유지한다.

**Tech Stack:** React 19, TypeScript, Zustand 5, Vanilla Extract, XYFlow 12, Automerge 3, Vitest

---

## Task 1: packages/contracts — @erdify/domain 추가 + 응답 타입 파일 생성

**Files:**
- Modify: `packages/contracts/package.json`
- Create: `packages/contracts/src/auth/auth.types.ts`
- Create: `packages/contracts/src/diagrams/diagram.types.ts`
- Create: `packages/contracts/src/organizations/organization.types.ts`
- Create: `packages/contracts/src/members/member.types.ts`
- Create: `packages/contracts/src/api-keys/api-key.types.ts`
- Create: `packages/contracts/src/projects/project.types.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: package.json에 @erdify/domain 추가**

`packages/contracts/package.json`의 `"dependencies"` 블록:
```json
"dependencies": {
  "@erdify/domain": "workspace:*",
  "zod": "^3.24.3"
}
```

- [ ] **Step 2: auth.types.ts 생성**

```ts
// packages/contracts/src/auth/auth.types.ts
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}
```

- [ ] **Step 3: diagram.types.ts 생성**

```ts
// packages/contracts/src/diagrams/diagram.types.ts
import type { DiagramDocument } from "@erdify/domain";

export type SharePreset = "1h" | "1d" | "7d" | "30d";

export interface DiagramResponse {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  content: DiagramDocument;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: "owner" | "editor" | "viewer";
  shareToken: string | null;
  shareExpiresAt: string | null;
}

export interface DiagramVersionResponse {
  id: string;
  diagramId: string;
  content: DiagramDocument;
  revision: number;
  createdBy: string;
  createdAt: string;
}

export interface ShareLinkResponse {
  shareToken: string;
  expiresAt: string;
}

export interface PublicDiagramResponse {
  id: string;
  name: string;
  content: DiagramDocument;
}
```

- [ ] **Step 4: organization.types.ts 생성**

```ts
// packages/contracts/src/organizations/organization.types.ts
export interface OrgResponse {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 5: member.types.ts 생성**

```ts
// packages/contracts/src/members/member.types.ts
export type MemberRoleType = "owner" | "editor" | "viewer";

export interface MemberInfo {
  userId: string;
  email: string;
  name: string;
  role: MemberRoleType;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRoleType;
  expiresAt: string;
  createdAt: string;
}

export interface InviteResult {
  status: "added" | "pending";
}
```

- [ ] **Step 6: api-key.types.ts 생성**

```ts
// packages/contracts/src/api-keys/api-key.types.ts
export interface ApiKeyItem {
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreated {
  apiKey: string;
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}
```

- [ ] **Step 7: project.types.ts 생성**

```ts
// packages/contracts/src/projects/project.types.ts
export interface ProjectResponse {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 8: index.ts 업데이트**

```ts
// packages/contracts/src/index.ts
export {
  createDiagramRequestSchema,
  diagramDialectSchema,
  type CreateDiagramRequest,
  type DiagramDialectContract,
} from "./diagrams/diagram-contract.schema";

export type { UserProfile } from "./auth/auth.types";
export type {
  DiagramResponse,
  DiagramVersionResponse,
  ShareLinkResponse,
  PublicDiagramResponse,
  SharePreset,
} from "./diagrams/diagram.types";
export type { OrgResponse } from "./organizations/organization.types";
export type {
  MemberRoleType,
  MemberInfo,
  PendingInvite,
  InviteResult,
} from "./members/member.types";
export type { ApiKeyItem, ApiKeyCreated } from "./api-keys/api-key.types";
export type { ProjectResponse } from "./projects/project.types";
```

- [ ] **Step 9: typecheck 통과 확인**

```bash
cd packages/contracts && pnpm typecheck
```
Expected: 에러 없음

- [ ] **Step 10: commit**

```bash
git add packages/contracts/
git commit -m "feat(contracts): add API response types and domain dependency"
```

---

## Task 2: apps/web — @erdify/contracts 의존성 추가 + api.ts 타입 이동

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/shared/api/auth.api.ts`
- Modify: `apps/web/src/shared/api/diagrams.api.ts`
- Modify: `apps/web/src/shared/api/organizations.api.ts`
- Modify: `apps/web/src/shared/api/members.api.ts`
- Modify: `apps/web/src/shared/api/api-keys.api.ts`
- Modify: `apps/web/src/shared/api/projects.api.ts`

- [ ] **Step 1: apps/web/package.json에 @erdify/contracts 추가**

`"dependencies"` 블록에 추가:
```json
"@erdify/contracts": "workspace:*",
```

- [ ] **Step 2: pnpm install (루트에서)**

```bash
pnpm install
```

- [ ] **Step 3: auth.api.ts — UserProfile을 contracts에서 import**

```ts
// apps/web/src/shared/api/auth.api.ts
import type { UserProfile } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type { UserProfile };

export function register(body: { email: string; password: string; name: string }): Promise<void> {
  return httpClient.post("/auth/register", body).then(() => undefined);
}
export function login(body: { email: string; password: string }): Promise<void> {
  return httpClient.post("/auth/login", body).then(() => undefined);
}
export function logout(): Promise<void> {
  return httpClient.post("/auth/logout").then(() => undefined);
}
export function getMe(): Promise<UserProfile> {
  return httpClient.get<UserProfile>("/auth/me").then((r) => r.data);
}
export function updateProfile(body: { name?: string }): Promise<UserProfile> {
  return httpClient.patch<UserProfile>("/auth/profile", body).then((r) => r.data);
}
export function uploadAvatar(file: File): Promise<UserProfile> {
  const form = new FormData();
  form.append("file", file);
  return httpClient.post<UserProfile>("/auth/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
}
export function changePassword(body: { currentPassword: string; newPassword: string }): Promise<void> {
  return httpClient.patch<void>("/auth/password", body).then((r) => r.data);
}
```

- [ ] **Step 4: diagrams.api.ts — 타입들을 contracts에서 import**

```ts
// apps/web/src/shared/api/diagrams.api.ts
import type {
  DiagramResponse,
  DiagramVersionResponse,
  ShareLinkResponse,
  PublicDiagramResponse,
  SharePreset,
} from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type {
  DiagramResponse,
  DiagramVersionResponse,
  ShareLinkResponse,
  PublicDiagramResponse,
  SharePreset,
};

export function createDiagram(
  projectId: string,
  body: { name: string; dialect: "postgresql" | "mysql" | "mariadb" | "mssql"; content?: object }
): Promise<DiagramResponse> {
  return httpClient.post<DiagramResponse>(`/projects/${projectId}/diagrams`, body).then((r) => r.data);
}
export function listDiagrams(projectId: string): Promise<DiagramResponse[]> {
  return httpClient.get<DiagramResponse[]>(`/projects/${projectId}/diagrams`).then((r) => r.data);
}
export function getDiagram(diagramId: string): Promise<DiagramResponse> {
  return httpClient.get<DiagramResponse>(`/diagrams/${diagramId}`).then((r) => r.data);
}
export function updateDiagram(diagramId: string, body: { name?: string; content?: object }): Promise<DiagramResponse> {
  return httpClient.patch<DiagramResponse>(`/diagrams/${diagramId}`, body).then((r) => r.data);
}
export function saveVersion(diagramId: string): Promise<DiagramVersionResponse> {
  return httpClient.post<DiagramVersionResponse>(`/diagrams/${diagramId}/versions`).then((r) => r.data);
}
export function listVersions(diagramId: string): Promise<DiagramVersionResponse[]> {
  return httpClient.get<DiagramVersionResponse[]>(`/diagrams/${diagramId}/versions`).then((r) => r.data);
}
export function restoreVersion(diagramId: string, versionId: string): Promise<DiagramResponse> {
  return httpClient.post<DiagramResponse>(`/diagrams/${diagramId}/restore/${versionId}`).then((r) => r.data);
}
export function deleteDiagram(diagramId: string): Promise<void> {
  return httpClient.delete(`/diagrams/${diagramId}`).then(() => undefined);
}
export function shareDiagram(diagramId: string, preset: SharePreset): Promise<ShareLinkResponse> {
  return httpClient.post<ShareLinkResponse>(`/diagrams/${diagramId}/share`, { preset }).then((r) => r.data);
}
export function revokeDiagramShare(diagramId: string): Promise<void> {
  return httpClient.delete(`/diagrams/${diagramId}/share`).then(() => undefined);
}
export function getPublicDiagram(shareToken: string): Promise<PublicDiagramResponse> {
  return httpClient.get<PublicDiagramResponse>(`/diagrams/public/${shareToken}`).then((r) => r.data);
}
```

- [ ] **Step 5: organizations.api.ts 업데이트**

```ts
// apps/web/src/shared/api/organizations.api.ts
import type { OrgResponse } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type { OrgResponse };

export const listMyOrganizations = (): Promise<OrgResponse[]> =>
  httpClient.get<OrgResponse[]>("/organizations").then((r) => r.data);
export const createOrganization = (body: { name: string }): Promise<OrgResponse> =>
  httpClient.post<OrgResponse>("/organizations", body).then((r) => r.data);
export const getOrganization = (id: string): Promise<OrgResponse> =>
  httpClient.get<OrgResponse>(`/organizations/${id}`).then((r) => r.data);
export const deleteOrganization = (id: string): Promise<void> =>
  httpClient.delete(`/organizations/${id}`).then(() => undefined);
export const inviteMemberByEmail = (
  orgId: string, email: string, role: "owner" | "editor" | "viewer"
): Promise<void> =>
  httpClient.post(`/organizations/${orgId}/members/invite`, { email, role }).then(() => undefined);
```

- [ ] **Step 6: members.api.ts 업데이트**

```ts
// apps/web/src/shared/api/members.api.ts
import type { MemberRoleType, MemberInfo, PendingInvite, InviteResult } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type { MemberRoleType, MemberInfo, PendingInvite, InviteResult };

export const getMembers = (orgId: string): Promise<MemberInfo[]> =>
  httpClient.get<MemberInfo[]>(`/organizations/${orgId}/members`).then((r) => r.data);
export const updateMemberRole = (orgId: string, userId: string, role: MemberRoleType): Promise<void> =>
  httpClient.patch(`/organizations/${orgId}/members/${userId}`, { role }).then(() => undefined);
export const removeMember = (orgId: string, userId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/members/${userId}`).then(() => undefined);
export const inviteMemberByEmail = (orgId: string, email: string, role: MemberRoleType): Promise<InviteResult> =>
  httpClient.post<InviteResult>(`/organizations/${orgId}/members/invite`, { email, role }).then((r) => r.data);
export const getPendingInvites = (orgId: string): Promise<PendingInvite[]> =>
  httpClient.get<PendingInvite[]>(`/organizations/${orgId}/invites`).then((r) => r.data);
export const cancelInvite = (orgId: string, inviteId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/invites/${inviteId}`).then(() => undefined);
```

- [ ] **Step 7: api-keys.api.ts 업데이트**

```ts
// apps/web/src/shared/api/api-keys.api.ts
import type { ApiKeyItem, ApiKeyCreated } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type { ApiKeyItem, ApiKeyCreated };

export const listApiKeys = (): Promise<ApiKeyItem[]> =>
  httpClient.get<ApiKeyItem[]>("/auth/api-keys").then((r) => r.data);
export const createApiKey = (body: { name?: string; expiresAt?: string }): Promise<ApiKeyCreated> =>
  httpClient.post<ApiKeyCreated>("/auth/api-keys", body).then((r) => r.data);
export const revokeApiKey = (id: string): Promise<void> =>
  httpClient.delete(`/auth/api-keys/${id}`).then(() => undefined);
export const regenerateApiKey = (id: string): Promise<ApiKeyCreated> =>
  httpClient.post<ApiKeyCreated>(`/auth/api-keys/${id}/regenerate`).then((r) => r.data);
```

- [ ] **Step 8: projects.api.ts 업데이트**

```ts
// apps/web/src/shared/api/projects.api.ts
import type { ProjectResponse } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type { ProjectResponse };

export const listProjects = (orgId: string): Promise<ProjectResponse[]> =>
  httpClient.get<ProjectResponse[]>(`/organizations/${orgId}/projects`).then((r) => r.data);
export const createProject = (orgId: string, body: { name: string }): Promise<ProjectResponse> =>
  httpClient.post<ProjectResponse>(`/organizations/${orgId}/projects`, body).then((r) => r.data);
export const deleteProject = (orgId: string, projectId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/projects/${projectId}`).then(() => undefined);
```

- [ ] **Step 9: typecheck + test**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
```
Expected: 에러 없음, 모든 테스트 통과

- [ ] **Step 10: commit**

```bash
git add apps/web/package.json apps/web/src/shared/api/ pnpm-lock.yaml
git commit -m "refactor(web): centralize API response types in @erdify/contracts"
```

---

## Task 3: shared/types 정리 + Yjs 제거

**Files:**
- Delete: `apps/web/src/shared/types/index.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: WorkspaceSummary 사용처 확인**

```bash
grep -r "WorkspaceSummary" apps/web/src
```
Expected: `shared/types/index.ts` 정의만 나오고 import 없음

- [ ] **Step 2: shared/types/index.ts 삭제**

파일 삭제: `apps/web/src/shared/types/index.ts`

- [ ] **Step 3: yjs 제거**

`apps/web/package.json`의 `"dependencies"`에서 `"yjs"` 항목 삭제.

- [ ] **Step 4: pnpm install (루트에서)**

```bash
pnpm install
```

- [ ] **Step 5: typecheck**

```bash
cd apps/web && pnpm typecheck
```
Expected: 에러 없음

- [ ] **Step 6: commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): remove unused WorkspaceSummary type and dead yjs dependency"
```

---

## Task 4: editor — collaboration-diff.ts 순수 함수 추출

**Files:**
- Create: `apps/web/src/features/editor/utils/collaboration-diff.ts`
- Modify: `apps/web/src/features/editor/hooks/useRealtimeCollaboration.ts`

- [ ] **Step 1: collaboration-diff.ts 생성**

```ts
// apps/web/src/features/editor/utils/collaboration-diff.ts
import type { DiagramDocument, DiagramEntity, DiagramColumn, DiagramIndex } from "@erdify/domain";

export function applyColumnDiff(
  draftColumns: DiagramColumn[],
  prevColumns: DiagramColumn[],
  nextColumns: DiagramColumn[]
): void {
  const prevIds = new Set(prevColumns.map((c) => c.id));
  const nextIds = new Set(nextColumns.map((c) => c.id));

  for (let i = draftColumns.length - 1; i >= 0; i--) {
    const col = draftColumns[i];
    if (col && !nextIds.has(col.id)) draftColumns.splice(i, 1);
  }
  for (const col of nextColumns) {
    if (!prevIds.has(col.id)) draftColumns.push({ ...col });
  }
  for (const nextCol of nextColumns) {
    if (!prevIds.has(nextCol.id)) continue;
    const draftCol = draftColumns.find((c) => c.id === nextCol.id);
    if (!draftCol) continue;
    if (draftCol.name !== nextCol.name) draftCol.name = nextCol.name;
    if (draftCol.type !== nextCol.type) draftCol.type = nextCol.type;
    if (draftCol.nullable !== nextCol.nullable) draftCol.nullable = nextCol.nullable;
    if (draftCol.primaryKey !== nextCol.primaryKey) draftCol.primaryKey = nextCol.primaryKey;
    if (draftCol.unique !== nextCol.unique) draftCol.unique = nextCol.unique;
    if (draftCol.defaultValue !== nextCol.defaultValue) draftCol.defaultValue = nextCol.defaultValue;
    if (draftCol.comment !== nextCol.comment) draftCol.comment = nextCol.comment;
    if (draftCol.ordinal !== nextCol.ordinal) draftCol.ordinal = nextCol.ordinal;
  }
}

export function applyDiff(
  draft: DiagramDocument,
  prev: DiagramDocument,
  next: DiagramDocument
): void {
  if (prev.entities !== next.entities) {
    const prevEntityIds = new Set(prev.entities.map((e) => e.id));
    const nextEntityIds = new Set(next.entities.map((e) => e.id));
    const draftEntities = draft.entities as DiagramEntity[];

    for (let i = draftEntities.length - 1; i >= 0; i--) {
      const e = draftEntities[i];
      if (e && !nextEntityIds.has(e.id)) draftEntities.splice(i, 1);
    }
    for (const entity of next.entities) {
      if (!prevEntityIds.has(entity.id)) {
        draftEntities.push({ ...entity, columns: [...entity.columns] });
      }
    }
    for (const nextEntity of next.entities) {
      if (!prevEntityIds.has(nextEntity.id)) continue;
      const prevEntity = prev.entities.find((e) => e.id === nextEntity.id);
      if (prevEntity === nextEntity) continue;
      const draftEntity = draftEntities.find((e) => e.id === nextEntity.id);
      if (!draftEntity) continue;
      if (draftEntity.name !== nextEntity.name) draftEntity.name = nextEntity.name;
      if (draftEntity.logicalName !== nextEntity.logicalName) draftEntity.logicalName = nextEntity.logicalName;
      if (draftEntity.comment !== nextEntity.comment) draftEntity.comment = nextEntity.comment;
      if (draftEntity.color !== nextEntity.color) draftEntity.color = nextEntity.color;
      const prevCols = prevEntity?.columns ?? [];
      applyColumnDiff(draftEntity.columns as DiagramColumn[], prevCols, nextEntity.columns);
    }
  }

  if (prev.layout.entityPositions !== next.layout.entityPositions) {
    const nextEntityIds = new Set(next.entities.map((e) => e.id));
    const positions = draft.layout.entityPositions as Record<string, { x: number; y: number }>;
    for (const [id, pos] of Object.entries(next.layout.entityPositions)) {
      const p = prev.layout.entityPositions[id];
      if (!p || p.x !== pos.x || p.y !== pos.y) positions[id] = pos;
    }
    for (const id of Object.keys(positions)) {
      if (!nextEntityIds.has(id)) delete positions[id];
    }
  }

  if (prev.relationships !== next.relationships) {
    const prevRelIds = new Set(prev.relationships.map((r) => r.id));
    const nextRelIds = new Set(next.relationships.map((r) => r.id));
    const draftRels = draft.relationships as DiagramDocument["relationships"];

    for (let i = draftRels.length - 1; i >= 0; i--) {
      const r = draftRels[i];
      if (r && !nextRelIds.has(r.id)) draftRels.splice(i, 1);
    }
    for (const rel of next.relationships) {
      if (!prevRelIds.has(rel.id)) draftRels.push({ ...rel });
    }
  }

  if (prev.indexes !== next.indexes) {
    const prevIdxIds = new Set(prev.indexes.map((i) => i.id));
    const nextIdxIds = new Set(next.indexes.map((i) => i.id));
    const draftIdxs = draft.indexes as DiagramIndex[];

    for (let i = draftIdxs.length - 1; i >= 0; i--) {
      const idx = draftIdxs[i];
      if (idx && !nextIdxIds.has(idx.id)) draftIdxs.splice(i, 1);
    }
    for (const idx of next.indexes) {
      if (!prevIdxIds.has(idx.id)) draftIdxs.push({ ...idx, columnIds: [...idx.columnIds] });
    }
    for (const nextIdx of next.indexes) {
      if (!prevIdxIds.has(nextIdx.id)) continue;
      const draftIdx = draftIdxs.find((i) => i.id === nextIdx.id);
      if (!draftIdx) continue;
      if (draftIdx.name !== nextIdx.name) draftIdx.name = nextIdx.name;
      if (draftIdx.unique !== nextIdx.unique) draftIdx.unique = nextIdx.unique;
      if (JSON.stringify(draftIdx.columnIds) !== JSON.stringify(nextIdx.columnIds)) {
        draftIdx.columnIds = [...nextIdx.columnIds];
      }
    }
  }
}
```

- [ ] **Step 2: useRealtimeCollaboration.ts에서 로컬 함수 제거 후 import로 교체**

파일 상단 import 블록을 다음으로 교체:
```ts
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import * as Automerge from "@automerge/automerge";
import type { DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { Collaborator } from "../stores/useEditorStore";
import { applyDiff } from "../utils/collaboration-diff";
```

파일에서 `applyColumnDiff` 함수 전체와 `applyDiff` 함수 전체를 삭제 (import로 대체됨).

- [ ] **Step 3: typecheck**

```bash
cd apps/web && pnpm typecheck
```
Expected: 에러 없음

- [ ] **Step 4: commit**

```bash
git add apps/web/src/features/editor/
git commit -m "refactor(editor): extract applyDiff/applyColumnDiff to collaboration-diff.ts"
```

---

## Task 5: editor — useCollaborationSocket 분리

**Files:**
- Create: `apps/web/src/features/editor/hooks/useCollaborationSocket.ts`
- Modify: `apps/web/src/features/editor/hooks/useRealtimeCollaboration.ts`

- [ ] **Step 1: useCollaborationSocket.ts 생성**

```ts
// apps/web/src/features/editor/hooks/useCollaborationSocket.ts
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { Collaborator } from "../stores/useEditorStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface CollaborationSocketHandlers {
  onInit: (bytes: number[]) => void;
  onChange: (change: number[]) => void;
  onPresenceState: (presence: Collaborator[]) => void;
}

export const useCollaborationSocket = (
  diagramId: string,
  handlers: CollaborationSocketHandlers
): React.RefObject<Socket | null> => {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!diagramId) return;

    const socket = io(`${API_BASE}/collaboration`, {
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join", { diagramId }));
    socket.on("am:init", (bytes: number[]) => handlersRef.current.onInit(bytes));
    socket.on("am:change", (change: number[]) => handlersRef.current.onChange(change));
    socket.on("presence:state", (presence: Collaborator[]) => handlersRef.current.onPresenceState(presence));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [diagramId]);

  return socketRef;
};
```

- [ ] **Step 2: useRealtimeCollaboration.ts 업데이트 — socket 생성 로직 제거, useCollaborationSocket 사용**

전체 파일을 아래로 교체:
```ts
// apps/web/src/features/editor/hooks/useRealtimeCollaboration.ts
import { useRef } from "react";
import * as Automerge from "@automerge/automerge";
import type { DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { Collaborator } from "../stores/useEditorStore";
import { applyDiff } from "../utils/collaboration-diff";
import { useCollaborationSocket } from "./useCollaborationSocket";
import { usePresence } from "./usePresence";

export type { Collaborator };

export const useRealtimeCollaboration = (diagramId: string) => {
  const amDocRef = useRef<Automerge.Doc<DiagramDocument> | null>(null);
  const isRemoteRef = useRef(false);

  const setDocument = useEditorStore((s) => s.setDocument);
  const setCollaborators = useEditorStore((s) => s.setCollaborators);

  const socketRef = useCollaborationSocket(diagramId, {
    onInit: (bytes) => {
      const serverDoc = Automerge.load<DiagramDocument>(Uint8Array.from(bytes));
      const { isDirty, document: localDoc } = useEditorStore.getState();

      if (isDirty && localDoc) {
        const baseDoc = amDocRef.current
          ? (JSON.parse(JSON.stringify(amDocRef.current)) as DiagramDocument)
          : (JSON.parse(JSON.stringify(serverDoc)) as DiagramDocument);
        const mergedDoc = Automerge.change(serverDoc, (draft) => {
          applyDiff(draft as DiagramDocument, baseDoc, localDoc);
        });
        const pendingChange = Automerge.getLastLocalChange(mergedDoc);
        amDocRef.current = mergedDoc;
        if (pendingChange && socketRef.current?.connected) {
          socketRef.current.emit("am:change", Array.from(pendingChange));
        }
        return;
      }

      amDocRef.current = serverDoc;
      isRemoteRef.current = true;
      setDocument(JSON.parse(JSON.stringify(serverDoc)) as DiagramDocument);
      isRemoteRef.current = false;
    },

    onChange: (change) => {
      if (!amDocRef.current) return;
      const [newDoc] = Automerge.applyChanges(amDocRef.current, [Uint8Array.from(change)]);
      amDocRef.current = newDoc;
      const wasDirty = useEditorStore.getState().isDirty;
      isRemoteRef.current = true;
      setDocument(JSON.parse(JSON.stringify(newDoc)) as DiagramDocument);
      isRemoteRef.current = false;
      if (wasDirty) useEditorStore.setState({ isDirty: true });
    },

    onPresenceState: (presence) => setCollaborators(presence),
  });

  usePresence(socketRef);

  // outgoing local changes → Automerge → socket (useEffect로 cleanup 보장)
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prevState) => {
      if (state.document === prevState.document) return;
      const newDoc = state.document;
      const prev = prevState.document;
      if (isRemoteRef.current || !newDoc || !prev || !amDocRef.current || !socketRef.current?.connected) return;
      const newAmDoc = Automerge.change(amDocRef.current, (draft) => {
        applyDiff(draft as DiagramDocument, prev, newDoc);
      });
      const change = Automerge.getLastLocalChange(newAmDoc);
      if (change) {
        amDocRef.current = newAmDoc;
        socketRef.current.emit("am:change", Array.from(change));
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
```

**Note:** `usePresence` 훅은 Task 6에서 만든다. 이 Task에서는 `usePresence` import 줄만 추가하고 Task 6 후에 typecheck한다.

- [ ] **Step 3: commit (usePresence 파일 없어도 타입 오류만 있으므로 Task 6과 함께 커밋)**

Task 6 완료 후 함께 커밋.

---

## Task 6: editor — usePresence 분리

**Files:**
- Create: `apps/web/src/features/editor/hooks/usePresence.ts`

- [ ] **Step 1: usePresence.ts 생성**

```ts
// apps/web/src/features/editor/hooks/usePresence.ts
import { useEffect } from "react";
import type { RefObject } from "react";
import type { Socket } from "socket.io-client";
import { useEditorStore } from "../stores/useEditorStore";

export const usePresence = (socketRef: RefObject<Socket | null>): void => {
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prevState) => {
      if (
        state.selectedEntityId !== prevState.selectedEntityId &&
        socketRef.current?.connected
      ) {
        socketRef.current.emit("presence:update", {
          selectedEntityId: state.selectedEntityId,
        });
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
```

- [ ] **Step 2: typecheck + test**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
```
Expected: 에러 없음, 기존 useRealtimeCollaboration 테스트 통과

- [ ] **Step 3: commit**

```bash
git add apps/web/src/features/editor/hooks/
git commit -m "refactor(editor): split useRealtimeCollaboration into useCollaborationSocket + usePresence"
```

---

## Task 7: editor — useEditorStore Zustand 슬라이스 분리

**Files:**
- Create: `apps/web/src/features/editor/stores/editor-store.types.ts`
- Create: `apps/web/src/features/editor/stores/editor-store.helpers.ts`
- Create: `apps/web/src/features/editor/stores/diagramSlice.ts`
- Create: `apps/web/src/features/editor/stores/uiSlice.ts`
- Create: `apps/web/src/features/editor/stores/collaboratorsSlice.ts`
- Create: `apps/web/src/features/editor/stores/pendingSlice.ts`
- Modify: `apps/web/src/features/editor/stores/useEditorStore.ts`

- [ ] **Step 1: editor-store.types.ts 생성 — 모든 타입 정의 중앙화**

```ts
// apps/web/src/features/editor/stores/editor-store.types.ts
import type { Node, Edge } from "@xyflow/react";
import type { DiagramEntity } from "@erdify/domain";

export type UnmatchedPkInput = {
  pkColId: string;
  pkColName: string;
  pkColType: string;
  suggestedName: string;
};

export type PendingConnection = {
  sourceEntityId: string;
  targetEntityId: string;
  autoMatchedCols: Array<{ fkColId: string; pkColId: string }>;
  unmatchedPks: UnmatchedPkInput[];
};

export type PendingRelDelete = {
  relId: string;
  srcEntityId: string;
  fkColIds: string[];
  fkColNames: string[];
};

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
```

- [ ] **Step 2: editor-store.helpers.ts 생성 — docToNodes, docToEdges, updateNodes 순수 함수**

```ts
// apps/web/src/features/editor/stores/editor-store.helpers.ts
import type { Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { DiagramDocument } from "@erdify/domain";
import type { EditableTableNodeType, Collaborator } from "./editor-store.types";

const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "#6366f1",
  width: 16,
  height: 16,
} as const;

export function docToEdges(doc: DiagramDocument): Edge[] {
  return doc.relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceEntityId,
    target: rel.targetEntityId,
    type: "cardinality" as const,
    markerEnd: EDGE_MARKER,
    data: { cardinality: rel.cardinality, identifying: rel.identifying },
  }));
}

export function docToNodes(
  doc: DiagramDocument,
  collaborators: Collaborator[] = []
): EditableTableNodeType[] {
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

export function updateNodes(
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

    if (prevNode && entitySame && positionSame && collabSame) return prevNode;

    return {
      id: entity.id,
      type: "editableTable" as const,
      position: nextDoc.layout.entityPositions[entity.id] ?? { x: 0, y: 0 },
      data: { entity, ...(collaboratorColor ? { collaboratorColor } : {}) },
    };
  });
}
```

- [ ] **Step 3: diagramSlice.ts 생성**

```ts
// apps/web/src/features/editor/stores/diagramSlice.ts
import type { Edge, NodeChange } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import type { DiagramDocument } from "@erdify/domain";
import type { StateCreator } from "zustand";
import type { EditableTableNodeType } from "./editor-store.types";
import { docToEdges, docToNodes, updateNodes } from "./editor-store.helpers";
import type { EditorState } from "./useEditorStore";

export interface DiagramSlice {
  document: DiagramDocument | null;
  nodes: EditableTableNodeType[];
  edges: Edge[];
  isDirty: boolean;
  canEdit: boolean;
  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  applyNodeChanges: (changes: NodeChange<EditableTableNodeType>[]) => void;
  setCanEdit: (canEdit: boolean) => void;
  clearDirty: () => void;
}

export const createDiagramSlice: StateCreator<EditorState, [], [], DiagramSlice> = (set, get) => ({
  document: null,
  nodes: [],
  edges: [],
  isDirty: false,
  canEdit: false,

  setDocument: (doc) =>
    set((state) => ({
      document: doc,
      nodes: docToNodes(doc, state.collaborators),
      edges: docToEdges(doc),
      isDirty: false,
    })),

  applyCommand: (fn) => {
    const { document, nodes, collaborators, edges } = get();
    if (!document) return;
    const next = fn(document);
    set({
      document: next,
      nodes: updateNodes(document, next, nodes, collaborators),
      edges: next.relationships !== document.relationships ? docToEdges(next) : edges,
      isDirty: true,
    });
  },

  applyNodeChanges: (changes) => {
    const { nodes } = get();
    set({ nodes: applyNodeChanges(changes, nodes) });
  },

  setCanEdit: (canEdit) => set({ canEdit }),
  clearDirty: () => set({ isDirty: false }),
});
```

- [ ] **Step 4: uiSlice.ts 생성**

```ts
// apps/web/src/features/editor/stores/uiSlice.ts
import type { StateCreator } from "zustand";
import type { EditorState } from "./useEditorStore";

export interface UISlice {
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  popoverPos: { x: number; y: number } | null;
  searchOpen: boolean;
  hiddenSchemas: Set<string>;
  schemaFilterExpanded: boolean;
  groupViewEnabled: boolean;
  setSelectedEntity: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  setPopoverPos: (pos: { x: number; y: number } | null) => void;
  setSearchOpen: (open: boolean) => void;
  toggleSchemaVisibility: (schema: string) => void;
  setSchemaFilterExpanded: (expanded: boolean) => void;
  setGroupViewEnabled: (enabled: boolean) => void;
}

export const createUISlice: StateCreator<EditorState, [], [], UISlice> = (set) => ({
  selectedEntityId: null,
  selectedRelationshipId: null,
  popoverPos: null,
  searchOpen: false,
  hiddenSchemas: new Set<string>(),
  schemaFilterExpanded: true,
  groupViewEnabled: true,

  setSelectedEntity: (id) => set({ selectedEntityId: id, selectedRelationshipId: null, popoverPos: null }),
  setSelectedRelationship: (id) => set({ selectedRelationshipId: id, selectedEntityId: null }),
  setPopoverPos: (pos) => set({ popoverPos: pos }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  toggleSchemaVisibility: (schema) =>
    set((state) => {
      const next = new Set(state.hiddenSchemas);
      if (next.has(schema)) next.delete(schema);
      else next.add(schema);
      return { hiddenSchemas: next };
    }),
  setSchemaFilterExpanded: (expanded) => set({ schemaFilterExpanded: expanded }),
  setGroupViewEnabled: (enabled) => set({ groupViewEnabled: enabled }),
});
```

- [ ] **Step 5: collaboratorsSlice.ts 생성**

```ts
// apps/web/src/features/editor/stores/collaboratorsSlice.ts
import type { StateCreator } from "zustand";
import type { Collaborator } from "./editor-store.types";
import { updateNodes } from "./editor-store.helpers";
import type { EditorState } from "./useEditorStore";

export interface CollaboratorsSlice {
  collaborators: Collaborator[];
  setCollaborators: (collaborators: Collaborator[]) => void;
}

export const createCollaboratorsSlice: StateCreator<EditorState, [], [], CollaboratorsSlice> = (set) => ({
  collaborators: [],
  setCollaborators: (collaborators) =>
    set((state) => ({
      collaborators,
      nodes: state.document
        ? updateNodes(state.document, state.document, state.nodes, collaborators)
        : state.nodes,
    })),
});
```

- [ ] **Step 6: pendingSlice.ts 생성**

```ts
// apps/web/src/features/editor/stores/pendingSlice.ts
import type { StateCreator } from "zustand";
import type { PendingConnection, PendingRelDelete } from "./editor-store.types";
import type { EditorState } from "./useEditorStore";

export interface PendingSlice {
  pendingConnection: PendingConnection | null;
  pendingRelDelete: PendingRelDelete | null;
  setPendingConnection: (p: PendingConnection | null) => void;
  setPendingRelDelete: (p: PendingRelDelete | null) => void;
}

export const createPendingSlice: StateCreator<EditorState, [], [], PendingSlice> = (set) => ({
  pendingConnection: null,
  pendingRelDelete: null,
  setPendingConnection: (p) => set({ pendingConnection: p }),
  setPendingRelDelete: (p) => set({ pendingRelDelete: p }),
});
```

- [ ] **Step 7: useEditorStore.ts 교체 — 슬라이스 조합**

```ts
// apps/web/src/features/editor/stores/useEditorStore.ts
import { create } from "zustand";
import type { DiagramSlice } from "./diagramSlice";
import type { UISlice } from "./uiSlice";
import type { CollaboratorsSlice } from "./collaboratorsSlice";
import type { PendingSlice } from "./pendingSlice";
import { createDiagramSlice } from "./diagramSlice";
import { createUISlice } from "./uiSlice";
import { createCollaboratorsSlice } from "./collaboratorsSlice";
import { createPendingSlice } from "./pendingSlice";

export type EditorState = DiagramSlice & UISlice & CollaboratorsSlice & PendingSlice;

export type {
  EditableTableNodeType,
  Collaborator,
  UnmatchedPkInput,
  PendingConnection,
  PendingRelDelete,
} from "./editor-store.types";

export const useEditorStore = create<EditorState>()((...a) => ({
  ...createDiagramSlice(...a),
  ...createUISlice(...a),
  ...createCollaboratorsSlice(...a),
  ...createPendingSlice(...a),
}));
```

**Note:** `EditorState` 타입이 순환 참조를 유발할 수 있다. 각 slice 파일에서 `EditorState`를 `import type { EditorState } from "./useEditorStore"`로 가져오는데, `useEditorStore.ts`는 slice들을 import한다. TypeScript는 type-only import를 허용하므로 런타임 순환 참조 없이 동작한다.

- [ ] **Step 8: typecheck + test**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
```
Expected: 에러 없음, 모든 테스트 통과

- [ ] **Step 9: commit**

```bash
git add apps/web/src/features/editor/stores/
git commit -m "refactor(editor): split useEditorStore into Zustand slices"
```

---

## Task 8: editor — EditableTableNode 폴더 분리

**Files:**
- Create: `apps/web/src/features/editor/components/editable-table-node/index.tsx`
- Create: `apps/web/src/features/editor/components/editable-table-node/TypeSelect.tsx`
- Create: `apps/web/src/features/editor/components/editable-table-node/SchemaSelector.tsx`
- Create: `apps/web/src/features/editor/components/editable-table-node/ColorPicker.tsx`
- Create: `apps/web/src/features/editor/components/editable-table-node/SchemaStrip.tsx`
- Create: `apps/web/src/features/editor/components/editable-table-node/IndexColumnSelect.tsx`
- Create: `apps/web/src/features/editor/components/editable-table-node/constants.ts`
- Rename: `editable-table-node.css.ts` → `apps/web/src/features/editor/components/editable-table-node/editable-table-node.css.ts`
- Delete: `apps/web/src/features/editor/components/EditableTableNode.tsx`
- Modify: `apps/web/src/features/editor/components/EditorCanvas.tsx` (import 경로 수정)

- [ ] **Step 1: constants.ts 생성**

```ts
// apps/web/src/features/editor/components/editable-table-node/constants.ts
import type { DiagramColumn, DiagramIndex } from "@erdify/domain";
import { randomUUID } from "../../../../shared/utils/uuid";

export const DEFAULT_HEADER_COLOR = "#0064E0";

export const PRESET_COLORS = [
  "#374151", "#0064E0", "#7c3aed", "#059669",
  "#dc2626", "#d97706", "#db2777", "#0891b2",
];

export const COLUMN_TYPES = [
  "varchar(255)", "text", "int", "bigint", "boolean",
  "timestamp", "uuid", "decimal(10,2)", "json", "jsonb",
];

export const makeColumn = (ordinal: number): DiagramColumn => ({
  id: randomUUID(),
  name: "column",
  type: "varchar(255)",
  nullable: true,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal,
});

export const makeIndex = (entityId: string, entityName: string): DiagramIndex => {
  const safeName = entityName.replace(/\s+/g, "_").toLowerCase();
  return {
    id: randomUUID(),
    entityId,
    name: `idx_${safeName}`,
    columnIds: [],
    unique: false,
  };
};
```

- [ ] **Step 2: TypeSelect.tsx 생성**

기존 `EditableTableNode.tsx`의 `TypeSelect` 컴포넌트 전체 (line 66-113) 추출:

```ts
// apps/web/src/features/editor/components/editable-table-node/TypeSelect.tsx
import { useState } from "react";
import type { KeyboardEvent } from "react";
import { COLUMN_TYPES } from "./constants";
import * as css from "./editable-table-node.css";

export const TypeSelect = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) => {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = COLUMN_TYPES.filter((t) =>
    t.toLowerCase().includes(inputVal.toLowerCase())
  );

  const commit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) onChange(trimmed);
    else setInputVal(value);
    setOpen(false);
  };

  return (
    <div className={css.typeSelectWrapper}>
      <input
        className={`${css.typeInput} nodrag`}
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); }}
        onFocus={() => { setInputVal(value); setOpen(true); }}
        onBlur={() => commit(inputVal)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") { e.preventDefault(); commit(inputVal); }
          if (e.key === "Escape") { setInputVal(value); setOpen(false); }
        }}
        placeholder="타입..."
        spellCheck={false}
        aria-label={label ?? "컬럼 타입"}
      />
      {open && filtered.length > 0 && (
        <div className={`${css.typeDropdown} nodrag nopan`}>
          {filtered.map((t) => (
            <button
              key={t}
              type="button"
              className={`${css.typeOption}${t === value ? ` ${css.typeOptionActive}` : ""}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(t); setInputVal(t); setOpen(false); }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: ColorPicker.tsx 생성**

기존 `EditableTableNode.tsx`의 `ColorPicker` 컴포넌트 (line 248-279) 추출:

```ts
// apps/web/src/features/editor/components/editable-table-node/ColorPicker.tsx
import { useState } from "react";
import { DEFAULT_HEADER_COLOR, PRESET_COLORS } from "./constants";
import * as css from "./editable-table-node.css";

export const ColorPicker = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = value ?? DEFAULT_HEADER_COLOR;

  return (
    <div className={css.colorPickerWrapper}>
      <button
        type="button"
        className={`${css.colorSwatch} nodrag`}
        style={{ background: current }}
        onClick={() => setOpen((o) => !o)}
        aria-label="헤더 색상 변경"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <div className={`${css.colorDropdown} nodrag nopan`}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={css.colorOption}
              style={{ background: c, outline: c === current ? "2px solid #fff" : "none" }}
              onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: SchemaStrip.tsx + SchemaSelector.tsx 생성**

```ts
// apps/web/src/features/editor/components/editable-table-node/SchemaStrip.tsx
import { getSchemaColor } from "../../../../shared/utils/schema-colors";

export const SchemaStrip = ({
  schema,
  allSchemas,
}: {
  schema: string;
  allSchemas: string[];
}) => {
  const color = getSchemaColor(schema, allSchemas);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 10px 3px 12px",
      fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
      borderBottom: `1px solid ${color}30`,
      background: `${color}10`,
      color,
      flexShrink: 0,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {schema}
    </div>
  );
};
```

`SchemaSelector.tsx`는 기존 `EditableTableNode.tsx`의 `SchemaSelector` 컴포넌트 (line 115-246) 전체를 아래 파일로 이동:

```ts
// apps/web/src/features/editor/components/editable-table-node/SchemaSelector.tsx
import { useState } from "react";
import { getSchemaColor } from "../../../../shared/utils/schema-colors";
// ... (기존 SchemaSelector 코드 그대로, DEFAULT_HEADER_COLOR import 불필요)
```

- [ ] **Step 5: IndexColumnSelect.tsx 생성**

기존 `IndexColumnSelect` 컴포넌트 (line 299-360) 추출:

```ts
// apps/web/src/features/editor/components/editable-table-node/IndexColumnSelect.tsx
import { useState } from "react";
import type { DiagramColumn } from "@erdify/domain";
import * as css from "./editable-table-node.css";
// ... 기존 IndexColumnSelect 코드 그대로
```

- [ ] **Step 6: index.tsx 생성 — EditableTableNode만 포함**

기존 `EditableTableNode.tsx`에서 서브컴포넌트 정의 제거 후, 서브컴포넌트들을 import해 사용하는 버전으로 작성:

```ts
// apps/web/src/features/editor/components/editable-table-node/index.tsx
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  addColumn, addIndex, removeColumn, removeEntity,
  removeIndex, renameEntity, setEntitySchema,
  updateColumn, updateEntityColor, updateEntityComment, updateIndex,
} from "@erdify/domain";
import { useEditorStore } from "../../stores/useEditorStore";
import type { EditableTableNodeType } from "../../stores/useEditorStore";
import { getSchemaColor, getSchemasFromDocument } from "../../../../shared/utils/schema-colors";
import { DEFAULT_HEADER_COLOR, makeColumn, makeIndex } from "./constants";
import { TypeSelect } from "./TypeSelect";
import { SchemaSelector } from "./SchemaSelector";
import { ColorPicker } from "./ColorPicker";
import { SchemaStrip } from "./SchemaStrip";
import { IndexColumnSelect } from "./IndexColumnSelect";
import * as css from "./editable-table-node.css";

export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  // ... 기존 EditableTableNode 코드 그대로 (서브컴포넌트 사용 부분만 남김)
};
```

- [ ] **Step 7: editable-table-node.css.ts 이동**

`apps/web/src/features/editor/components/editable-table-node.css.ts` →
`apps/web/src/features/editor/components/editable-table-node/editable-table-node.css.ts`

- [ ] **Step 8: 기존 EditableTableNode.tsx 삭제**

`apps/web/src/features/editor/components/EditableTableNode.tsx` 삭제.

- [ ] **Step 9: EditorCanvas.tsx import 경로 수정**

```ts
// Before:
import { EditableTableNode } from "./EditableTableNode";
// After:
import { EditableTableNode } from "./editable-table-node";
```

- [ ] **Step 10: typecheck + test**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
```

- [ ] **Step 11: commit**

```bash
git add apps/web/src/features/editor/components/
git commit -m "refactor(editor): split EditableTableNode into sub-components folder"
```

---

## Task 9: editor — EditorCanvas 책임 분리

**Files:**
- Create: `apps/web/src/features/editor/utils/canvas-layout.ts`
- Create: `apps/web/src/features/editor/components/CanvasContextMenu.tsx`
- Modify: `apps/web/src/features/editor/components/EditorCanvas.tsx`

- [ ] **Step 1: canvas-layout.ts 생성 — 순수 레이아웃 함수 추출**

```ts
// apps/web/src/features/editor/utils/canvas-layout.ts
import type { DiagramDocument } from "@erdify/domain";

type MeasuredSizes = Map<string, { w: number; h: number }>;

function layoutComponents(
  components: string[][],
  inDegree: Map<string, number>,
  doc: DiagramDocument,
  measuredSizes: MeasuredSizes,
  originX: number,
  originY: number,
  NODE_W: number,
  H_GAP: number,
  V_GAP: number,
  COMP_H_GAP: number,
): { positions: Record<string, { x: number; y: number }>; groupW: number; groupH: number } {
  // ... 기존 layoutComponents 코드 그대로
}

function bfsComponents(entityIds: string[], adj: Map<string, Set<string>>): string[][] {
  // ... 기존 bfsComponents 코드 그대로
}

export function computeAutoLayout(
  doc: DiagramDocument,
  measuredSizes: MeasuredSizes
): Record<string, { x: number; y: number }> {
  // ... 기존 computeAutoLayout 코드 그대로
}
```

- [ ] **Step 2: CanvasContextMenu.tsx 생성 — ContextMenuInner 추출**

```ts
// apps/web/src/features/editor/components/CanvasContextMenu.tsx
import type { CSSProperties, MouseEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import { addEntity, updateEntityPosition } from "@erdify/domain";
import { randomUUID } from "../../../shared/utils/uuid";
import { useEditorStore } from "../stores/useEditorStore";
import { computeAutoLayout } from "../utils/canvas-layout";

interface CanvasContextMenuProps {
  menuX: number;
  menuY: number;
  clientX: number;
  clientY: number;
  onClose: () => void;
}

export const CanvasContextMenu = ({ menuX, menuY, clientX, clientY, onClose }: CanvasContextMenuProps) => {
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const document = useEditorStore((s) => s.document);
  const groupViewEnabled = useEditorStore((s) => s.groupViewEnabled);
  const setGroupViewEnabled = useEditorStore((s) => s.setGroupViewEnabled);

  const handleAddTable = () => {
    const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
    const entityId = randomUUID();
    applyCommand((doc) => {
      const next = addEntity(doc, { id: entityId, name: `Table_${doc.entities.length + 1}` });
      return updateEntityPosition(next, entityId, flowPos);
    });
    onClose();
  };

  const handleAutoLayout = () => {
    if (!document) return;
    const measuredSizes = new Map(
      getNodes().map((n) => [n.id, { w: n.measured?.width ?? 280, h: n.measured?.height ?? 120 }])
    );
    const positions = computeAutoLayout(document, measuredSizes);
    applyCommand((doc) => {
      let next = doc;
      for (const entity of doc.entities) {
        const pos = positions[entity.id];
        if (pos) next = updateEntityPosition(next, entity.id, pos);
      }
      return next;
    });
    setTimeout(() => fitView({ duration: 400, padding: 0.08 }), 50);
    onClose();
  };

  if (!document) return null;

  const menuItemStyle: CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, width: "100%",
    padding: "9px 14px", background: "none", border: "none",
    textAlign: "left", cursor: "pointer", color: "#374151",
    fontSize: 12, fontFamily: "monospace",
  };
  const onEnter = (e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "#f1f5f9"; };
  const onLeave = (e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "none"; };

  return (
    <div
      className="nodrag nopan"
      style={{
        position: "absolute", left: menuX, top: menuY,
        background: "#ffffff", border: "1px solid #e2e8f0",
        borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
        zIndex: 1000, minWidth: 160, fontSize: 12, fontFamily: "monospace", overflow: "hidden",
      }}
    >
      <button type="button" onClick={handleAddTable} style={menuItemStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <span style={{ fontSize: 14 }}>+</span> 테이블 추가
      </button>
      <div style={{ height: 1, background: "#f1f5f9", margin: "0 8px" }} />
      <button type="button" onClick={handleAutoLayout} style={menuItemStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <span style={{ fontSize: 13 }}>⊞</span> 테이블 자동 정렬
      </button>
      <div style={{ height: 1, background: "#f1f5f9", margin: "0 8px" }} />
      <button
        type="button"
        onClick={() => { setGroupViewEnabled(!groupViewEnabled); onClose(); }}
        style={menuItemStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <span style={{ fontSize: 13 }}>{groupViewEnabled ? "◻" : "▦"}</span>
        {groupViewEnabled ? "그룹 숨기기" : "그룹 보기"}
      </button>
    </div>
  );
};
```

- [ ] **Step 3: EditorCanvas.tsx에서 추출된 코드 제거 및 import 교체**

EditorCanvas.tsx에서:
1. `layoutComponents`, `bfsComponents`, `computeAutoLayout` 함수 삭제 → `import { computeAutoLayout } from "../utils/canvas-layout"`
2. `ContextMenuInner` 컴포넌트 삭제 → `import { CanvasContextMenu } from "./CanvasContextMenu"`
3. `ContextMenuState` 타입은 EditorCanvas.tsx 내부에서만 사용되므로 유지

- [ ] **Step 4: typecheck + test**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
```

- [ ] **Step 5: commit**

```bash
git add apps/web/src/features/editor/
git commit -m "refactor(editor): extract CanvasContextMenu and canvas-layout utils from EditorCanvas"
```

---

## Task 10: dashboard — useDiagramImport 훅 추출

**Files:**
- Create: `apps/web/src/features/dashboard/hooks/useDiagramImport.ts`
- Modify: `apps/web/src/features/dashboard/components/ImportDiagramModal.tsx`

- [ ] **Step 1: useDiagramImport.ts 생성**

ImportDiagramModal.tsx에서 상태 + 로직 추출:

```ts
// apps/web/src/features/dashboard/hooks/useDiagramImport.ts
import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { createDiagram } from "../../../shared/api/diagrams.api";
import { parseDdl } from "../../../shared/utils/ddl-parser";
import { parseExerd } from "../../../shared/utils/exerd-parser";
import { randomUUID } from "../../../shared/utils/uuid";
import type { DiagramDialect } from "@erdify/domain";

type TabType = DiagramDialect | "exerd";

interface UseDiagramImportOptions {
  projectId: string;
  onImported: (diagramId: string) => void;
}

export const useDiagramImport = ({ projectId, onImported }: UseDiagramImportOptions) => {
  const [tab, setTab] = useState<TabType>("mysql");
  const [name, setName] = useState("");
  const [sql, setSql] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTab("mysql");
    setName("");
    setSql("");
    setFileContent(null);
    setFileName(null);
    setError(null);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setFileContent(e.target?.result as string);
    reader.readAsText(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const source = fileContent ?? sql;
      if (tab === "exerd") {
        const doc = parseExerd(source);
        const diagramName = name || "imported";
        const res = await createDiagram(projectId, {
          name: diagramName,
          dialect: "mysql",
          content: doc,
        });
        onImported(res.id);
        return;
      }
      const dialect = tab as DiagramDialect;
      const doc = parseDdl(source, dialect);
      const inferredName = name || (source ? (
        source.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\[?[\w.]+\]?\.)?[\["`]?([\w]+)[\]"`]?\s*\(/i)?.[1] ?? "imported"
      ) : "imported");
      const res = await createDiagram(projectId, {
        name: inferredName,
        dialect,
        content: doc,
      });
      onImported(res.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "임포트 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return {
    tab, setTab,
    name, setName,
    sql, setSql,
    fileContent, fileName,
    isDragging, setIsDragging,
    error, loading,
    fileInputRef,
    reset, onDrop, onFileChange, submit,
    clearFile: () => { setFileContent(null); setFileName(null); if (fileInputRef.current) fileInputRef.current.value = ""; },
  };
};
```

- [ ] **Step 2: ImportDiagramModal.tsx 단순화 — UI만 남기고 useDiagramImport 사용**

파일 상단 imports와 로직을 훅 호출로 교체하고, JSX는 그대로 유지하되 상태를 훅에서 가져오도록 수정.

- [ ] **Step 3: typecheck + test**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
```

- [ ] **Step 4: commit**

```bash
git add apps/web/src/features/dashboard/
git commit -m "refactor(dashboard): extract import logic into useDiagramImport hook"
```

---

## Task 11: dashboard — UnifiedSidebar 서브컴포넌트 분리

**Files:**
- Create: `apps/web/src/features/dashboard/components/unified-sidebar/index.tsx`
- Create: `apps/web/src/features/dashboard/components/unified-sidebar/SidebarOrgSection.tsx`
- Create: `apps/web/src/features/dashboard/components/unified-sidebar/SidebarDiagramList.tsx`
- Create: `apps/web/src/features/dashboard/components/unified-sidebar/SidebarBottomBar.tsx`
- Delete: `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx`
- Modify: `apps/web/src/features/dashboard/pages/DashboardPage.tsx`
- Modify: `apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx`

- [ ] **Step 1: 현재 UnifiedSidebar 구조 파악**

```bash
grep -n "const " apps/web/src/features/dashboard/components/UnifiedSidebar.tsx
```

- [ ] **Step 2: SidebarBottomBar.tsx 생성**

UnifiedSidebar.tsx 하단 버튼 바 영역 추출 (API키 버튼, 프로필 버튼 포함):

```ts
// apps/web/src/features/dashboard/components/unified-sidebar/SidebarBottomBar.tsx
import * as css from "../unified-sidebar.css";

interface SidebarBottomBarProps {
  onApiKeys: () => void;
  onProfile: () => void;
}

export const SidebarBottomBar = ({ onApiKeys, onProfile }: SidebarBottomBarProps) => {
  // 기존 UnifiedSidebar 하단 버튼 바 JSX
};
```

- [ ] **Step 3: SidebarOrgSection.tsx 생성**

조직/프로젝트 트리 영역 추출.

- [ ] **Step 4: SidebarDiagramList.tsx 생성**

다이어그램 목록 영역 추출.

- [ ] **Step 5: unified-sidebar/index.tsx 생성**

```ts
// apps/web/src/features/dashboard/components/unified-sidebar/index.tsx
import { useState } from "react";
import type { FocusEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyOrganizations } from "../../../../shared/api/organizations.api";
import { listProjects } from "../../../../shared/api/projects.api";
import { listDiagrams } from "../../../../shared/api/diagrams.api";
import { SidebarOrgSection } from "./SidebarOrgSection";
import { SidebarDiagramList } from "./SidebarDiagramList";
import { SidebarBottomBar } from "./SidebarBottomBar";
import * as css from "../unified-sidebar.css";

// UnifiedSidebar props 타입 동일 유지
interface UnifiedSidebarProps { /* ... 기존과 동일 */ }

export const UnifiedSidebar = ({ ... }: UnifiedSidebarProps) => {
  // data fetching 유지 (useQuery 3개)
  // 서브컴포넌트 조합
};
```

- [ ] **Step 6: 기존 UnifiedSidebar.tsx 삭제**

`apps/web/src/features/dashboard/components/UnifiedSidebar.tsx` 삭제.

- [ ] **Step 7: import 경로 수정**

`DashboardPage.tsx`:
```ts
// Before:
import { UnifiedSidebar } from "../components/UnifiedSidebar";
// After:
import { UnifiedSidebar } from "../components/unified-sidebar";
```

`UnifiedSidebar.test.tsx`:
```ts
// Before:
import { UnifiedSidebar } from "./UnifiedSidebar";
// After:
import { UnifiedSidebar } from "./unified-sidebar";
```

- [ ] **Step 8: typecheck + test**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
```

- [ ] **Step 9: commit**

```bash
git add apps/web/src/features/dashboard/
git commit -m "refactor(dashboard): split UnifiedSidebar into sub-components folder"
```

---

## 완료 후 확인

- [ ] 전체 typecheck

```bash
pnpm --filter "@erdify/contracts" typecheck && pnpm --filter "@erdify/web" typecheck
```

- [ ] 전체 테스트

```bash
pnpm --filter "@erdify/web" test --run
```

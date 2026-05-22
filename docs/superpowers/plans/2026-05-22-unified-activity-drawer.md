# Unified Activity Drawer + Autosave Bug Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에디터 헤더의 "기록"·"AI 활동" 두 패널을 하나의 ActivityDrawer로 통합하고, 사용자 이름 표시·토글 칩 필터를 추가하며, 컬럼 autosave 경쟁 조건 버그를 수정한다.

**Architecture:** 백엔드에서 버전 조회 시 User 테이블을 join해 `createdByName`을 포함한 응답을 내려준다. 프론트엔드에서 `useActivityFeed` 훅이 버전 기록·MCP 세션 두 데이터를 시간순으로 병합한다. `ActivityDrawer`가 이 피드를 렌더링하며 토글 칩 필터로 사람/AI 항목을 구분한다.

**Tech Stack:** NestJS (TypeORM), `@erdify/contracts` (공유 타입), React + Vanilla Extract + TanStack Query (Zustand store)

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `packages/contracts/src/diagrams/diagram.types.ts` | `DiagramVersionResponse`에 `createdByName` 추가 |
| Modify | `apps/api/src/modules/diagrams/diagrams.module.ts` | `User` 엔티티 등록 |
| Modify | `apps/api/src/modules/diagrams/services/diagrams-version.service.ts` | `findVersions`에서 User join → `createdByName` 포함 반환 |
| Modify | `apps/api/src/modules/diagrams/diagrams.service.ts` | 반환 타입을 `DiagramVersionWithName[]`으로 업데이트 |
| Modify | `apps/web/src/features/editor/hooks/useDiagramAutosave.ts` | deps에서 `isDirty` 제거 (버그 수정) |
| Modify | `apps/web/src/features/editor/hooks/useDiagramAutosave.test.ts` | 경쟁 조건 회귀 테스트 추가 |
| Create | `apps/web/src/features/editor/hooks/useActivityFeed.ts` | 버전+세션 병합 훅 |
| Create | `apps/web/src/features/editor/hooks/useActivityFeed.test.ts` | 훅 테스트 |
| Create | `apps/web/src/features/editor/components/ActivityDrawer.tsx` | 통합 드로어 컴포넌트 |
| Create | `apps/web/src/features/editor/components/activity-drawer.css.ts` | 드로어 스타일 |
| Modify | `apps/web/src/features/editor/pages/EditorPage.tsx` | 버튼 2개→1개, 드로어 교체 |
| Delete | `apps/web/src/features/editor/components/VersionHistoryDrawer.tsx` | 삭제 |
| Delete | `apps/web/src/features/editor/components/version-history-drawer.css.ts` | 삭제 |
| Delete | `apps/web/src/features/editor/components/VersionHistoryDrawerSkeleton.tsx` | 삭제 |
| Delete | `apps/web/src/features/editor/components/McpActivityDrawer.tsx` | 삭제 |
| Delete | `apps/web/src/features/editor/components/mcp-activity-drawer.css.ts` | 삭제 |

---

## Task 1: Autosave 버그 수정

**Files:**
- Modify: `apps/web/src/features/editor/hooks/useDiagramAutosave.test.ts`
- Modify: `apps/web/src/features/editor/hooks/useDiagramAutosave.ts`

- [ ] **Step 1: 경쟁 조건 재현 테스트 작성 (실패해야 함)**

`useDiagramAutosave.test.ts` 파일의 기존 describe 블록 안 마지막에 추가:

```ts
it("pending timer for newer document survives after clearDirty is called (race condition regression)", async () => {
  const doc1 = createEmptyDiagram({ id: "d", name: "v1", dialect: "postgresql" });
  const doc2 = createEmptyDiagram({ id: "d", name: "v2", dialect: "postgresql" });

  // Make the first save take a long time (simulating slow API)
  let resolveFirstSave!: () => void;
  vi.mocked(diagramsApi.updateDiagram)
    .mockImplementationOnce(
      () => new Promise<never>((resolve) => { resolveFirstSave = resolve as () => void; })
    )
    .mockResolvedValue({} as never);

  renderHook(() => useDiagramAutosave("diag-1", 500));

  // First change → timer T1 starts
  act(() => { useEditorStore.setState({ document: doc1, isDirty: true }); });
  act(() => { vi.advanceTimersByTime(500); }); // T1 fires → API call begins (slow)
  await act(async () => {});

  // Second change → timer T2 starts for doc2
  act(() => { useEditorStore.setState({ document: doc2, isDirty: true }); });

  // First API call completes → clearDirty() is called
  await act(async () => { resolveFirstSave(); });
  await act(async () => {});

  // T2 should still fire and save doc2
  act(() => { vi.advanceTimersByTime(500); });
  await act(async () => {});

  expect(diagramsApi.updateDiagram).toHaveBeenCalledTimes(2);
  expect(diagramsApi.updateDiagram).toHaveBeenLastCalledWith("diag-1", { content: doc2 });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd apps/web && pnpm test -- --reporter=verbose src/features/editor/hooks/useDiagramAutosave.test.ts
```

Expected: 마지막 테스트 FAIL — `updateDiagram` called 1번만 호출됨

- [ ] **Step 3: `useDiagramAutosave.ts` deps에서 `isDirty` 제거**

`apps/web/src/features/editor/hooks/useDiagramAutosave.ts` 의 첫 번째 `useEffect`를 아래와 같이 수정:

```ts
import { useEffect } from "react";
import { updateDiagram } from "@/shared/api/diagrams.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

export function useDiagramAutosave(diagramId: string, delayMs = 3000): void {
  const isDirty = useEditorStore((s) => s.isDirty);
  const document = useEditorStore((s) => s.document);
  const clearDirty = useEditorStore((s) => s.clearDirty);

  useEffect(() => {
    if (!isDirty || !document || !diagramId) return;

    const timer = setTimeout(async () => {
      try {
        await updateDiagram(diagramId, { content: document });
        clearDirty();
      } catch {
        // autosave failures are silent — user can still explicitly save a version
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [document, diagramId, delayMs, clearDirty]); // isDirty 제거

  // 뒤로가기 등으로 언마운트 시 pending 변경사항 즉시 저장
  useEffect(() => {
    return () => {
      const state = useEditorStore.getState();
      if (state.isDirty && state.document && diagramId) {
        void updateDiagram(diagramId, { content: state.document });
      }
    };
  }, [diagramId]);
}
```

- [ ] **Step 4: 테스트 전체 통과 확인**

```bash
cd apps/web && pnpm test -- --reporter=verbose src/features/editor/hooks/useDiagramAutosave.test.ts
```

Expected: 4개 테스트 모두 PASS

- [ ] **Step 5: Commit**

```bash
cd /path/to/ERDify
git add apps/web/src/features/editor/hooks/useDiagramAutosave.ts \
        apps/web/src/features/editor/hooks/useDiagramAutosave.test.ts
git commit -m "fix: prevent autosave timer cancellation on clearDirty race condition"
```

---

## Task 2: contracts — `DiagramVersionResponse`에 `createdByName` 추가

**Files:**
- Modify: `packages/contracts/src/diagrams/diagram.types.ts`

- [ ] **Step 1: `createdByName` 필드 추가**

`packages/contracts/src/diagrams/diagram.types.ts`의 `DiagramVersionResponse` 인터페이스를 아래로 교체:

```ts
export interface DiagramVersionResponse {
  id: string;
  diagramId: string;
  content: DiagramDocument;
  revision: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}
```

- [ ] **Step 2: 타입체크 통과 확인**

```bash
cd packages/contracts && pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 3: `useVersionHistory.test.tsx`의 `fakeVersion` 업데이트**

`apps/web/src/features/editor/hooks/useVersionHistory.test.tsx`의 `fakeVersion` 함수에 `createdByName` 추가:

```ts
const fakeVersion = (): DiagramVersionResponse => ({
  id: "v1",
  diagramId: "diag-1",
  content: createEmptyDiagram({ id: "d", name: "t", dialect: "postgresql" }),
  revision: 1,
  createdBy: "user-1",
  createdByName: "Alice",
  createdAt: "2026-04-30T12:00:00Z"
});
```

- [ ] **Step 4: 타입체크 통과 확인**

```bash
cd apps/web && pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/diagrams/diagram.types.ts \
        apps/web/src/features/editor/hooks/useVersionHistory.test.tsx
git commit -m "feat(contracts): add createdByName to DiagramVersionResponse"
```

---

## Task 3: API — `findVersions`에서 User join

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.module.ts`
- Modify: `apps/api/src/modules/diagrams/services/diagrams-version.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.service.ts`

- [ ] **Step 1: `diagrams.module.ts`에 `User` 등록**

```ts
import { Diagram, DiagramVersion, McpSession, Organization, Project, User } from "@erdify/db";
// ...
TypeOrmModule.forFeature([Diagram, DiagramVersion, McpSession, Organization, Project, User]),
```

- [ ] **Step 2: `diagrams-version.service.ts` 수정**

파일 전체를 아래로 교체:

```ts
import { randomUUID } from "crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, Project, User } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../../common/services/authorization.service";

export interface DiagramVersionWithName {
  id: string;
  diagramId: string;
  content: object;
  revision: number;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

@Injectable()
export class DiagramsVersionService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(DiagramVersion)
    private readonly versionRepo: Repository<DiagramVersion>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly authorizationService: AuthorizationService
  ) {}

  private async getDiagramWithOrg(diagramId: string): Promise<{ diagram: Diagram; orgId: string }> {
    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");
    const project = await this.projectRepo.findOne({ where: { id: diagram.projectId } });
    if (!project) throw new NotFoundException("Project not found");
    return { diagram, orgId: project.organizationId };
  }

  async saveVersion(diagramId: string, userId: string): Promise<DiagramVersion> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const last = await this.versionRepo.findOne({ where: { diagramId }, order: { revision: "DESC" } });
    const revision = (last?.revision ?? 0) + 1;
    return this.versionRepo.save(
      this.versionRepo.create({ id: randomUUID(), diagramId, content: diagram.content, revision, createdBy: userId })
    );
  }

  async findVersions(diagramId: string, userId: string): Promise<DiagramVersionWithName[]> {
    const { orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireMember(orgId, userId);

    const versions = await this.versionRepo.find({
      where: { diagramId },
      order: { revision: "DESC" },
    });

    // Collect unique human userIds (exclude "mcp")
    const humanIds = [...new Set(versions.map((v) => v.createdBy).filter((id) => id !== "mcp"))];
    const users = humanIds.length > 0
      ? await this.userRepo.find({ where: humanIds.map((id) => ({ id })) })
      : [];
    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    return versions.map((v) => ({
      id: v.id,
      diagramId: v.diagramId,
      content: v.content,
      revision: v.revision,
      createdBy: v.createdBy,
      createdByName: v.createdBy === "mcp" ? "AI" : (nameMap.get(v.createdBy) ?? "Unknown"),
      createdAt: v.createdAt,
    }));
  }

  async restoreVersion(diagramId: string, versionId: string, userId: string): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const version = await this.versionRepo.findOne({ where: { id: versionId, diagramId } });
    if (!version) throw new NotFoundException("Version not found");
    diagram.content = version.content;
    return this.diagramRepo.save(diagram);
  }
}
```

- [ ] **Step 3: `diagrams.service.ts` 반환 타입 업데이트**

`diagrams.service.ts`에서 `findVersions` 메서드의 반환 타입을 업데이트:

```ts
import type { DiagramVersionWithName } from "./services/diagrams-version.service";

// ...

findVersions(diagramId: string, userId: string): Promise<DiagramVersionWithName[]> {
  return this.version.findVersions(diagramId, userId);
}
```

(파일 상단 import에 `DiagramVersionWithName`을 추가하고, 기존 `DiagramVersion[]` 반환 타입을 교체)

- [ ] **Step 4: API 타입체크 통과 확인**

```bash
cd apps/api && pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/diagrams/diagrams.module.ts \
        apps/api/src/modules/diagrams/services/diagrams-version.service.ts \
        apps/api/src/modules/diagrams/diagrams.service.ts
git commit -m "feat(api): include createdByName in findVersions response"
```

---

## Task 4: Web — `useActivityFeed` 훅

**Files:**
- Create: `apps/web/src/features/editor/hooks/useActivityFeed.ts`
- Create: `apps/web/src/features/editor/hooks/useActivityFeed.test.ts`

- [ ] **Step 1: 테스트 파일 작성 (실패 상태)**

`apps/web/src/features/editor/hooks/useActivityFeed.test.ts` 생성:

```ts
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useActivityFeed } from "./useActivityFeed";
import * as diagramsApi from "@/shared/api/diagrams.api";
import * as mcpApi from "@/shared/api/mcp-sessions.api";

vi.mock("@/shared/api/diagrams.api");
vi.mock("@/shared/api/mcp-sessions.api");

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

const makeVersion = (revision: number, createdAt: string) => ({
  id: `v${revision}`,
  diagramId: "d1",
  content: {} as never,
  revision,
  createdBy: "user-1",
  createdByName: "Alice",
  createdAt,
});

const makeSession = (id: string, createdAt: string) => ({
  id,
  summary: "AI did stuff",
  toolCalls: [{ tool: "add_table", summary: "users 테이블 추가" }],
  snapshotVersionId: null,
  createdAt,
  updatedAt: createdAt,
});

describe("useActivityFeed", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns empty feed initially", () => {
    vi.mocked(diagramsApi.listVersions).mockReturnValue(new Promise(() => {}));
    vi.mocked(mcpApi.listMcpSessions).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useActivityFeed("d1"), { wrapper: createWrapper() });
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("merges versions and sessions sorted by createdAt DESC", async () => {
    const v1 = makeVersion(1, "2026-05-22T10:00:00Z");
    const s1 = makeSession("s1", "2026-05-22T10:05:00Z");
    const v2 = makeVersion(2, "2026-05-22T10:10:00Z");

    vi.mocked(diagramsApi.listVersions).mockResolvedValue([v2, v1]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([s1]);

    const { result } = renderHook(() => useActivityFeed("d1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0]).toMatchObject({ kind: "version", revision: 2 });
    expect(result.current.items[1]).toMatchObject({ kind: "ai", id: "s1" });
    expect(result.current.items[2]).toMatchObject({ kind: "version", revision: 1 });
  });

  it("exposes restoreVersion and revertSession actions", async () => {
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([]);

    const { result } = renderHook(() => useActivityFeed("d1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.restoreVersion).toBe("function");
    expect(typeof result.current.revertSession).toBe("function");
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd apps/web && pnpm test -- --reporter=verbose src/features/editor/hooks/useActivityFeed.test.ts
```

Expected: FAIL — `useActivityFeed` not found

- [ ] **Step 3: `useActivityFeed.ts` 구현**

`apps/web/src/features/editor/hooks/useActivityFeed.ts` 생성:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listVersions, restoreVersion } from "@/shared/api/diagrams.api";
import { listMcpSessions, revertMcpSession } from "@/shared/api/mcp-sessions.api";
import type { DiagramVersionResponse } from "@/shared/api/diagrams.api";
import type { McpSessionResponse } from "@/shared/api/mcp-sessions.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

export type VersionActivityItem = DiagramVersionResponse & { kind: "version" };
export type AiActivityItem = McpSessionResponse & { kind: "ai" };
export type ActivityItem = VersionActivityItem | AiActivityItem;

export interface UseActivityFeedResult {
  items: ActivityItem[];
  isLoading: boolean;
  restoreVersion: (versionId: string) => void;
  isRestoring: boolean;
  revertSession: (sessionId: string) => void;
  isReverting: boolean;
}

export function useActivityFeed(diagramId: string): UseActivityFeedResult {
  const queryClient = useQueryClient();
  const setDocument = useEditorStore((s) => s.setDocument);

  const versionsQuery = useQuery({
    queryKey: ["diagram-versions", diagramId],
    queryFn: () => listVersions(diagramId),
    enabled: !!diagramId,
  });

  const sessionsQuery = useQuery({
    queryKey: ["mcp-sessions", diagramId],
    queryFn: () => listMcpSessions(diagramId),
    enabled: !!diagramId,
    refetchInterval: 10000,
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreVersion(diagramId, versionId),
    onSuccess: (diagram) => {
      setDocument(diagram.content);
      queryClient.invalidateQueries({ queryKey: ["diagram", diagramId] });
      queryClient.invalidateQueries({ queryKey: ["diagram-versions", diagramId] });
    },
  });

  const revertMutation = useMutation({
    mutationFn: (sessionId: string) => revertMcpSession(diagramId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagram", diagramId] });
      queryClient.invalidateQueries({ queryKey: ["mcp-sessions", diagramId] });
    },
  });

  const versionItems: VersionActivityItem[] = (versionsQuery.data ?? []).map((v) => ({
    ...v,
    kind: "version" as const,
  }));
  const aiItems: AiActivityItem[] = (sessionsQuery.data ?? []).map((s) => ({
    ...s,
    kind: "ai" as const,
  }));

  const items: ActivityItem[] = [...versionItems, ...aiItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    items,
    isLoading: versionsQuery.isLoading || sessionsQuery.isLoading,
    restoreVersion: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending,
    revertSession: revertMutation.mutate,
    isReverting: revertMutation.isPending,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/web && pnpm test -- --reporter=verbose src/features/editor/hooks/useActivityFeed.test.ts
```

Expected: 3개 테스트 모두 PASS

- [ ] **Step 5: 타입체크 확인**

```bash
cd apps/web && pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/editor/hooks/useActivityFeed.ts \
        apps/web/src/features/editor/hooks/useActivityFeed.test.ts
git commit -m "feat(web): add useActivityFeed hook merging versions and AI sessions"
```

---

## Task 5: Web — `ActivityDrawer` 컴포넌트

**Files:**
- Create: `apps/web/src/features/editor/components/activity-drawer.css.ts`
- Create: `apps/web/src/features/editor/components/ActivityDrawer.tsx`

- [ ] **Step 1: `activity-drawer.css.ts` 생성**

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const drawer = style({
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: "320px",
  background: vars.color.surface,
  borderLeft: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  zIndex: 10,
  boxShadow: vars.shadow.md,
});

export const drawerHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const drawerTitle = style({
  margin: 0,
  fontSize: "14px",
  fontWeight: "600",
  color: vars.color.textPrimary,
});

export const closeBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  color: vars.color.textSecondary,
  padding: "2px",
  borderRadius: vars.radius.sm,
  lineHeight: 1,
  selectors: {
    "&:hover": { color: vars.color.textPrimary, background: vars.color.surfaceSecondary },
  },
});

export const filterRow = style({
  display: "flex",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const chip = style({
  display: "flex",
  alignItems: "center",
  gap: "5px",
  padding: `3px 10px`,
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: 500,
  border: `1.5px solid ${vars.color.border}`,
  color: vars.color.textSecondary,
  background: "none",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "border-color 120ms ease, color 120ms ease, background 120ms ease",
});

export const chipOn = style({
  borderColor: vars.color.primary,
  color: vars.color.primary,
  background: `color-mix(in srgb, ${vars.color.primary} 10%, transparent)`,
});

export const chipDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  flexShrink: 0,
});

export const drawerBody = style({
  flex: 1,
  overflowY: "auto",
  padding: `${vars.space["2"]} 0`,
});

export const emptyText = style({
  color: vars.color.textDisabled,
  fontSize: "13px",
  padding: `${vars.space["4"]} ${vars.space["4"]}`,
  margin: 0,
});

export const activityItem = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.space["2"],
  padding: `10px ${vars.space["4"]}`,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const itemIcon = style({
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  flexShrink: 0,
  marginTop: "1px",
  fontWeight: 600,
});

export const itemIconHuman = style({
  background: `color-mix(in srgb, #60a5fa 15%, transparent)`,
  color: "#60a5fa",
});

export const itemIconAi = style({
  background: `color-mix(in srgb, #a78bfa 15%, transparent)`,
  color: "#a78bfa",
});

export const itemBody = style({
  flex: 1,
  minWidth: 0,
});

export const itemSummary = style({
  fontSize: "12px",
  color: vars.color.textPrimary,
  lineHeight: "1.4",
});

export const itemMeta = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  marginTop: "2px",
});

export const itemRevertBtn = style({
  flexShrink: 0,
  fontSize: "11px",
  color: vars.color.textSecondary,
  padding: `3px 8px`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  background: "none",
  cursor: "pointer",
  fontFamily: vars.font.family,
  whiteSpace: "nowrap",
  transition: "color 120ms ease, border-color 120ms ease",
  selectors: {
    "&:hover:not(:disabled)": { color: vars.color.textPrimary, borderColor: vars.color.textSecondary },
    "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
  },
});
```

- [ ] **Step 2: `ActivityDrawer.tsx` 생성**

```tsx
import { useState } from "react";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { useActivityFeed } from "@/features/editor/hooks/useActivityFeed";
import type { ActivityItem } from "@/features/editor/hooks/useActivityFeed";
import * as css from "./activity-drawer.css";

const formatTime = (iso: string): string => {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "어제";
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(iso).toLocaleDateString();
};

interface ActivityItemRowProps {
  item: ActivityItem;
  onRestore: (id: string) => void;
  onRevert: (id: string) => void;
  isActing: boolean;
  isDirty: boolean;
}

const ActivityItemRow = ({ item, onRestore, onRevert, isActing, isDirty }: ActivityItemRowProps) => {
  const isVersion = item.kind === "version";

  const handleAction = () => {
    if (isVersion) {
      if (isDirty && !window.confirm("저장되지 않은 변경사항이 있습니다. 복원하면 변경사항이 사라집니다. 계속하시겠습니까?")) return;
      onRestore(item.id);
    } else {
      if (window.confirm("이 세션 이전 상태로 되돌립니다. 계속하시겠습니까?")) {
        onRevert(item.id);
      }
    }
  };

  return (
    <div className={css.activityItem}>
      <div className={`${css.itemIcon} ${isVersion ? css.itemIconHuman : css.itemIconAi}`}>
        {isVersion ? (item as { createdByName: string }).createdByName.charAt(0).toUpperCase() : "AI"}
      </div>
      <div className={css.itemBody}>
        <div className={css.itemSummary}>
          {isVersion
            ? `v${(item as { revision: number }).revision} 버전 저장`
            : ((item as { summary: string | null }).summary ?? "AI 활동")}
        </div>
        <div className={css.itemMeta}>
          {isVersion
            ? `${(item as { createdByName: string }).createdByName} · ${formatTime(item.createdAt)}`
            : `AI · ${formatTime(item.createdAt)}`}
        </div>
      </div>
      <button className={css.itemRevertBtn} disabled={isActing} onClick={handleAction}>
        되돌리기
      </button>
    </div>
  );
};

interface ActivityDrawerProps {
  diagramId: string;
  onClose: () => void;
}

export const ActivityDrawer = ({ diagramId, onClose }: ActivityDrawerProps) => {
  const [showHuman, setShowHuman] = useState(true);
  const [showAi, setShowAi] = useState(true);
  const isDirty = useEditorStore((s) => s.isDirty);
  const { items, isLoading, restoreVersion, isRestoring, revertSession, isReverting } =
    useActivityFeed(diagramId);

  const filtered = items.filter(
    (item) => (item.kind === "version" && showHuman) || (item.kind === "ai" && showAi)
  );

  return (
    <div className={css.drawer}>
      <div className={css.drawerHeader}>
        <h3 className={css.drawerTitle}>활동 기록</h3>
        <button onClick={onClose} aria-label="닫기" className={css.closeBtn}>✕</button>
      </div>

      <div className={css.filterRow}>
        <button
          className={`${css.chip} ${showHuman ? css.chipOn : ""}`}
          onClick={() => setShowHuman((v) => !v)}
        >
          <span className={css.chipDot} style={{ background: "#60a5fa" }} />
          사람
        </button>
        <button
          className={`${css.chip} ${showAi ? css.chipOn : ""}`}
          onClick={() => setShowAi((v) => !v)}
        >
          <span className={css.chipDot} style={{ background: "#a78bfa" }} />
          AI
        </button>
      </div>

      <div className={css.drawerBody}>
        {isLoading ? (
          <p className={css.emptyText}>불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <p className={css.emptyText}>표시할 활동이 없습니다.</p>
        ) : (
          filtered.map((item) => (
            <ActivityItemRow
              key={`${item.kind}-${item.id}`}
              item={item}
              onRestore={restoreVersion}
              onRevert={revertSession}
              isActing={isRestoring || isReverting}
              isDirty={isDirty}
            />
          ))
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: 타입체크 확인**

```bash
cd apps/web && pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/editor/components/ActivityDrawer.tsx \
        apps/web/src/features/editor/components/activity-drawer.css.ts
git commit -m "feat(web): add ActivityDrawer unified timeline with human/AI filter"
```

---

## Task 6: Web — EditorPage 배선 + 구 파일 삭제

**Files:**
- Modify: `apps/web/src/features/editor/pages/EditorPage.tsx`
- Delete: `apps/web/src/features/editor/components/VersionHistoryDrawer.tsx`
- Delete: `apps/web/src/features/editor/components/version-history-drawer.css.ts`
- Delete: `apps/web/src/features/editor/components/VersionHistoryDrawerSkeleton.tsx`
- Delete: `apps/web/src/features/editor/components/McpActivityDrawer.tsx`
- Delete: `apps/web/src/features/editor/components/mcp-activity-drawer.css.ts`

- [ ] **Step 1: `EditorPage.tsx` import 교체**

파일 상단 import에서 아래 두 줄 제거:
```ts
import { VersionHistoryDrawer } from "../components/VersionHistoryDrawer";
import { McpActivityDrawer } from "../components/McpActivityDrawer";
```

아래 줄 추가:
```ts
import { ActivityDrawer } from "../components/ActivityDrawer";
```

- [ ] **Step 2: state 정리**

`showHistory`, `showMcpActivity`, `mcpSeenAt` 세 state 제거, `showActivity` 하나로 교체:

```ts
// 제거
const [showHistory, setShowHistory] = useState(false);
const [showMcpActivity, setShowMcpActivity] = useState(false);
const [mcpSeenAt] = useState<number | null>(() => { ... });

// 추가
const [showActivity, setShowActivity] = useState(false);
```

- [ ] **Step 3: `useVersionHistory` 훅 사용 부분 교체**

`EditorPage.tsx`에서 아래 라인 제거:
```ts
const { saveVersion, isSavingVersion } = useVersionHistory(diagramId ?? "", showHistory);
```

`useVersionHistory` import도 제거. 대신 `saveVersion`이 필요하므로 `useActivityFeed`에서 사용하지 않고, 별도로 `useVersionHistory`를 더 좁은 범위로 유지하거나 `useMutation`을 직접 사용한다.

가장 단순한 방법: `saveVersion`은 계속 `useVersionHistory`에서 가져오되 enabled를 항상 true로:
```ts
import { useVersionHistory } from "@/features/editor/hooks/useVersionHistory";
// ...
const { saveVersion, isSavingVersion } = useVersionHistory(diagramId ?? "");
```

- [ ] **Step 4: 헤더 버튼 교체**

헤더에서 AI 활동 버튼과 기록 버튼 두 개를 삭제하고 하나로 교체:

```tsx
// 삭제
<button
  onClick={() => {
    setShowMcpActivity((v) => !v);
    if (diagramId) {
      localStorage.setItem(`mcp_seen_${diagramId}`, Date.now().toString());
    }
  }}
  className={css.topbarBtn({ variant: showMcpActivity ? "historyActive" : "historyInactive" })}
  title="AI 활동"
  aria-label="AI 활동"
>
  🤖
</button>
<button
  onClick={() => setShowHistory((v) => !v)}
  className={css.topbarBtn({ variant: showHistory ? "historyActive" : "historyInactive" })}
>
  기록
</button>

// 추가 (위치: 버전 저장 버튼 바로 다음)
<button
  onClick={() => setShowActivity((v) => !v)}
  className={css.topbarBtn({ variant: showActivity ? "historyActive" : "historyInactive" })}
  title="활동 기록"
>
  활동 기록
</button>
```

- [ ] **Step 5: 드로어 렌더링 교체**

`content` div 안에서 아래 두 블록 제거:
```tsx
{showHistory && diagramId ? (
  <VersionHistoryDrawer diagramId={diagramId} onClose={() => setShowHistory(false)} />
) : null}
{showMcpActivity && diagramId ? (
  <McpActivityDrawer
    diagramId={diagramId}
    seenAt={mcpSeenAt}
    onClose={() => setShowMcpActivity(false)}
  />
) : null}
```

아래로 교체:
```tsx
{showActivity && diagramId ? (
  <ActivityDrawer diagramId={diagramId} onClose={() => setShowActivity(false)} />
) : null}
```

- [ ] **Step 6: 구 파일 삭제**

```bash
cd apps/web/src/features/editor
rm components/VersionHistoryDrawer.tsx \
   components/version-history-drawer.css.ts \
   components/VersionHistoryDrawerSkeleton.tsx \
   components/McpActivityDrawer.tsx \
   components/mcp-activity-drawer.css.ts
```

- [ ] **Step 7: 타입체크 통과 확인**

```bash
cd apps/web && pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 8: 전체 테스트 통과 확인**

```bash
cd apps/web && pnpm test
```

Expected: 모든 테스트 PASS (VersionHistoryDrawer.test.tsx 는 삭제 대상이므로 함께 삭제)

```bash
rm apps/web/src/features/editor/components/VersionHistoryDrawer.test.tsx
```

- [ ] **Step 9: Final Commit**

```bash
git add -A
git commit -m "feat(web): wire ActivityDrawer in EditorPage, remove old drawers"
```

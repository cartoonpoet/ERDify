# ERDify Phase 4 — Persistence & Version Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에디터에 3초 디바운스 자동저장, 명시적 버전 저장, 버전 히스토리 드로어(복원 포함)를 추가한다.

**Architecture:** 자동저장은 `useEffect` + `setTimeout` 기반 순수 훅으로 구현해 TanStack Query 의존성을 없앤다. 버전 히스토리는 TanStack Query로 서버 상태를 관리한다. 백엔드에 `restoreVersion` 엔드포인트를 추가하고, `VersionHistoryDrawer`는 캔버스 위에 오버레이되는 사이드 패널로 구현한다.

**Tech Stack:** NestJS, TypeORM, TanStack Query v5, Zustand v5, @testing-library/react v16, vitest

---

## 생성/수정 파일 구조

```
apps/api/src/modules/diagrams/
  diagrams.service.ts           MODIFY — add restoreVersion()
  diagrams.controller.ts        MODIFY — POST /diagrams/:id/restore/:versionId
  diagrams.service.spec.ts      MODIFY — add 3 restoreVersion tests

apps/web/src/shared/api/
  diagrams.api.ts               MODIFY — add restoreVersion()

apps/web/src/features/editor/
  hooks/
    useDiagramAutosave.ts       CREATE — debounced autosave (useEffect + setTimeout)
    useDiagramAutosave.test.ts  CREATE — 3 tests with fake timers
    useVersionHistory.ts        CREATE — TanStack Query: list + save + restore
    useVersionHistory.test.ts   CREATE — 3 tests
  components/
    VersionHistoryDrawer.tsx    CREATE — version list side panel
    VersionHistoryDrawer.test.tsx CREATE — 2 render tests
  EditorPage.tsx                MODIFY — autosave, 버전 저장 버튼, 기록 드로어 연결
```

---

## Task 1: Backend — restoreVersion 엔드포인트

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.controller.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.service.spec.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`apps/api/src/modules/diagrams/diagrams.service.spec.ts` 파일 끝의 닫는 `});` 바로 앞에 아래 세 개 테스트를 추가한다.

현재 파일 끝에서 `describe("DiagramsService"` 의 닫힘 `});` 를 찾아 그 바로 위에 삽입:

```ts
  describe("restoreVersion", () => {
    it("restores version content to current diagram", async () => {
      const version = makeVersion({ content: { restored: true } as unknown as object });
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.findOne.mockResolvedValue(diagram);
      versionRepo.findOne.mockResolvedValue(version);
      diagramRepo.save.mockImplementation((d: Diagram) => Promise.resolve(d));

      const result = await service.restoreVersion("diag-1", "v1", "user-1");

      expect(result.content).toEqual({ restored: true });
      expect(diagramRepo.save).toHaveBeenCalled();
    });

    it("throws NotFoundException when version does not exist", async () => {
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.findOne.mockResolvedValue(diagram);
      versionRepo.findOne.mockResolvedValue(null);

      await expect(service.restoreVersion("diag-1", "missing", "user-1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws ForbiddenException for viewer role", async () => {
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));
      diagramRepo.findOne.mockResolvedValue(diagram);

      await expect(service.restoreVersion("diag-1", "v1", "user-1")).rejects.toThrow(
        ForbiddenException
      );
    });
  });
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: `restoreVersion is not a function` 또는 유사한 오류

- [ ] **Step 3: DiagramsService에 restoreVersion 추가**

`apps/api/src/modules/diagrams/diagrams.service.ts` 의 `findVersions` 메서드 아래에 추가:

```ts
  async restoreVersion(diagramId: string, versionId: string, userId: string): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireEditorOrOwner(orgId, userId);

    const version = await this.versionRepo.findOne({ where: { id: versionId, diagramId } });
    if (!version) throw new NotFoundException("Version not found");

    diagram.content = version.content;
    return this.diagramRepo.save(diagram);
  }
```

- [ ] **Step 4: Controller에 엔드포인트 추가**

`apps/api/src/modules/diagrams/diagrams.controller.ts` 의 `findVersions` 핸들러 아래에 추가:

```ts
  @Post("diagrams/:id/restore/:versionId")
  @HttpCode(HttpStatus.OK)
  restoreVersion(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("versionId") versionId: string
  ) {
    return this.diagramsService.restoreVersion(id, versionId, user.sub);
  }
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/api test
pnpm --filter @erdify/api typecheck
```

Expected: 모든 테스트 통과 (기존 포함)

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/modules/diagrams
git commit -m "feat(diagrams): add restoreVersion endpoint"
```

---

## Task 2: Frontend API 클라이언트 — restoreVersion 추가

**Files:**
- Modify: `apps/web/src/shared/api/diagrams.api.ts`

- [ ] **Step 1: diagrams.api.ts 끝에 함수 추가**

`apps/web/src/shared/api/diagrams.api.ts` 파일 끝에 추가:

```ts
export function restoreVersion(diagramId: string, versionId: string): Promise<DiagramResponse> {
  return httpClient
    .post<DiagramResponse>(`/diagrams/${diagramId}/restore/${versionId}`)
    .then((r) => r.data);
}
```

- [ ] **Step 2: 타입체크 확인**

```bash
pnpm --filter @erdify/web typecheck
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/shared/api/diagrams.api.ts
git commit -m "feat(web): add restoreVersion API client function"
```

---

## Task 3: Frontend — useDiagramAutosave 훅

**Files:**
- Create: `apps/web/src/features/editor/hooks/useDiagramAutosave.ts`
- Create: `apps/web/src/features/editor/hooks/useDiagramAutosave.test.ts`

- [ ] **Step 1: 실패하는 테스트 파일 작성**

`apps/web/src/features/editor/hooks/useDiagramAutosave.test.ts` 생성:

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDiagram } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as diagramsApi from "../../../shared/api/diagrams.api";
import { useDiagramAutosave } from "./useDiagramAutosave";

vi.mock("../../../shared/api/diagrams.api");

const resetStore = () =>
  useEditorStore.setState({ document: null, isDirty: false, selectedEntityId: null });

describe("useDiagramAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    vi.mocked(diagramsApi.updateDiagram).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not call updateDiagram when isDirty is false", () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });
    useEditorStore.setState({ document: doc, isDirty: false });

    renderHook(() => useDiagramAutosave("diag-1", 500));
    act(() => { vi.advanceTimersByTime(1000); });

    expect(diagramsApi.updateDiagram).not.toHaveBeenCalled();
  });

  it("calls updateDiagram after debounce delay when isDirty", async () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });

    renderHook(() => useDiagramAutosave("diag-1", 500));

    act(() => {
      useEditorStore.setState({ document: doc, isDirty: true });
    });
    act(() => { vi.advanceTimersByTime(500); });
    await act(async () => {});

    expect(diagramsApi.updateDiagram).toHaveBeenCalledWith("diag-1", { content: doc });
  });

  it("resets debounce timer on consecutive changes — saves only once with latest content", async () => {
    const doc1 = createEmptyDiagram({ id: "d", name: "v1", dialect: "postgresql" });
    const doc2 = { ...doc1, name: "v2" };

    renderHook(() => useDiagramAutosave("diag-1", 500));

    act(() => { useEditorStore.setState({ document: doc1, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(200); }); // 아직 저장 안 됨
    act(() => { useEditorStore.setState({ document: doc2, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(500); }); // 마지막 변경 후 500ms 경과
    await act(async () => {});

    expect(diagramsApi.updateDiagram).toHaveBeenCalledTimes(1);
    expect(diagramsApi.updateDiagram).toHaveBeenCalledWith("diag-1", { content: doc2 });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/web test -- useDiagramAutosave
```

Expected: `Cannot find module './useDiagramAutosave'`

- [ ] **Step 3: 훅 구현**

`apps/web/src/features/editor/hooks/useDiagramAutosave.ts` 생성:

```ts
import { useEffect } from "react";
import { updateDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../stores/useEditorStore";

export function useDiagramAutosave(diagramId: string, delayMs = 3000): void {
  const isDirty = useEditorStore((s) => s.isDirty);
  const document = useEditorStore((s) => s.document);
  const clearDirty = useEditorStore((s) => s.clearDirty);

  useEffect(() => {
    if (!isDirty || !document) return;

    const timer = setTimeout(async () => {
      try {
        await updateDiagram(diagramId, { content: document });
        clearDirty();
      } catch {
        // 자동저장 실패는 무시 — 사용자는 수동으로 버전을 저장할 수 있다
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isDirty, document, diagramId, delayMs, clearDirty]);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- useDiagramAutosave
pnpm --filter @erdify/web typecheck
```

Expected: `3 passed`

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/editor/hooks
git commit -m "feat(editor): add useDiagramAutosave hook with debounce"
```

---

## Task 4: Frontend — useVersionHistory 훅

**Files:**
- Create: `apps/web/src/features/editor/hooks/useVersionHistory.ts`
- Create: `apps/web/src/features/editor/hooks/useVersionHistory.test.ts`

- [ ] **Step 1: 실패하는 테스트 파일 작성**

`apps/web/src/features/editor/hooks/useVersionHistory.test.ts` 생성:

```ts
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDiagram } from "@erdify/domain";
import type { DiagramResponse, DiagramVersionResponse } from "../../../shared/api/diagrams.api";
import * as diagramsApi from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../stores/useEditorStore";
import { useVersionHistory } from "./useVersionHistory";

vi.mock("../../../shared/api/diagrams.api");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const fakeVersion = (): DiagramVersionResponse => ({
  id: "v1",
  diagramId: "diag-1",
  content: createEmptyDiagram({ id: "d", name: "t", dialect: "postgresql" }),
  revision: 1,
  createdBy: "user-1",
  createdAt: "2026-04-30T12:00:00Z"
});

describe("useVersionHistory", () => {
  beforeEach(() => {
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([]);
    vi.mocked(diagramsApi.saveVersion).mockResolvedValue(fakeVersion());
    useEditorStore.setState({ document: null, isDirty: false, selectedEntityId: null });
  });

  afterEach(() => vi.clearAllMocks());

  it("returns empty versions array initially", () => {
    const { result } = renderHook(() => useVersionHistory("diag-1"), {
      wrapper: createWrapper()
    });
    expect(result.current.versions).toEqual([]);
  });

  it("saveVersion calls the API", async () => {
    const { result } = renderHook(() => useVersionHistory("diag-1"), {
      wrapper: createWrapper()
    });
    await act(async () => {
      result.current.saveVersion();
    });
    expect(diagramsApi.saveVersion).toHaveBeenCalledWith("diag-1");
  });

  it("restoreVersion calls API and updates editor document", async () => {
    const doc = createEmptyDiagram({ id: "d", name: "restored", dialect: "postgresql" });
    const restored: DiagramResponse = {
      id: "diag-1",
      projectId: "proj-1",
      name: "restored",
      content: doc,
      createdAt: "2026-04-30T00:00:00Z",
      updatedAt: "2026-04-30T00:00:00Z"
    };
    vi.mocked(diagramsApi.restoreVersion).mockResolvedValue(restored);

    const { result } = renderHook(() => useVersionHistory("diag-1"), {
      wrapper: createWrapper()
    });

    await act(async () => {
      result.current.restoreVersion("v1");
    });

    expect(diagramsApi.restoreVersion).toHaveBeenCalledWith("diag-1", "v1");
    expect(useEditorStore.getState().document).toEqual(doc);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/web test -- useVersionHistory
```

Expected: `Cannot find module './useVersionHistory'`

- [ ] **Step 3: 훅 구현**

`apps/web/src/features/editor/hooks/useVersionHistory.ts` 생성:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listVersions,
  restoreVersion,
  saveVersion
} from "../../../shared/api/diagrams.api";
import type { DiagramVersionResponse } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../stores/useEditorStore";

export interface UseVersionHistoryResult {
  versions: DiagramVersionResponse[];
  isLoadingVersions: boolean;
  saveVersion: () => void;
  isSavingVersion: boolean;
  restoreVersion: (versionId: string) => void;
  isRestoring: boolean;
}

export function useVersionHistory(diagramId: string): UseVersionHistoryResult {
  const queryClient = useQueryClient();
  const setDocument = useEditorStore((s) => s.setDocument);

  const versionsQuery = useQuery({
    queryKey: ["diagram-versions", diagramId],
    queryFn: () => listVersions(diagramId),
    enabled: !!diagramId
  });

  const saveVersionMutation = useMutation({
    mutationFn: () => saveVersion(diagramId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["diagram-versions", diagramId] })
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreVersion(diagramId, versionId),
    onSuccess: (diagram) => {
      setDocument(diagram.content);
      queryClient.invalidateQueries({ queryKey: ["diagram", diagramId] });
    }
  });

  return {
    versions: versionsQuery.data ?? [],
    isLoadingVersions: versionsQuery.isLoading,
    saveVersion: saveVersionMutation.mutate,
    isSavingVersion: saveVersionMutation.isPending,
    restoreVersion: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- useVersionHistory
pnpm --filter @erdify/web typecheck
```

Expected: `3 passed`

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/editor/hooks/useVersionHistory.ts \
        apps/web/src/features/editor/hooks/useVersionHistory.test.ts
git commit -m "feat(editor): add useVersionHistory hook"
```

---

## Task 5: Frontend — VersionHistoryDrawer 컴포넌트

**Files:**
- Create: `apps/web/src/features/editor/components/VersionHistoryDrawer.tsx`
- Create: `apps/web/src/features/editor/components/VersionHistoryDrawer.test.tsx`

- [ ] **Step 1: 실패하는 테스트 파일 작성**

`apps/web/src/features/editor/components/VersionHistoryDrawer.test.tsx` 생성:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseVersionHistoryResult } from "../hooks/useVersionHistory";
import { VersionHistoryDrawer } from "./VersionHistoryDrawer";

vi.mock("../hooks/useVersionHistory");

import { useVersionHistory } from "../hooks/useVersionHistory";

const mockHook = (overrides: Partial<UseVersionHistoryResult> = {}): UseVersionHistoryResult => ({
  versions: [],
  isLoadingVersions: false,
  saveVersion: vi.fn(),
  isSavingVersion: false,
  restoreVersion: vi.fn(),
  isRestoring: false,
  ...overrides
});

describe("VersionHistoryDrawer", () => {
  it("renders empty state when there are no versions", () => {
    vi.mocked(useVersionHistory).mockReturnValue(mockHook());

    render(<VersionHistoryDrawer diagramId="d" onClose={vi.fn()} />);

    expect(screen.getByText("버전 기록")).toBeInTheDocument();
    expect(screen.getByText("저장된 버전이 없습니다.")).toBeInTheDocument();
  });

  it("renders version list when versions exist", () => {
    vi.mocked(useVersionHistory).mockReturnValue(
      mockHook({
        versions: [
          {
            id: "v1",
            diagramId: "d",
            content: {} as never,
            revision: 1,
            createdBy: "user-1",
            createdAt: "2026-04-30T12:00:00Z"
          }
        ]
      })
    );

    render(<VersionHistoryDrawer diagramId="d" onClose={vi.fn()} />);

    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복원" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/web test -- VersionHistoryDrawer
```

Expected: `Cannot find module './VersionHistoryDrawer'`

- [ ] **Step 3: 컴포넌트 구현**

`apps/web/src/features/editor/components/VersionHistoryDrawer.tsx` 생성:

```tsx
import { useVersionHistory } from "../hooks/useVersionHistory";

interface VersionHistoryDrawerProps {
  diagramId: string;
  onClose: () => void;
}

export function VersionHistoryDrawer({ diagramId, onClose }: VersionHistoryDrawerProps) {
  const { versions, isLoadingVersions, restoreVersion, isRestoring } =
    useVersionHistory(diagramId);

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        background: "#fff",
        borderLeft: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        boxShadow: "-4px 0 12px rgba(0,0,0,0.06)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>버전 기록</h3>
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280" }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {isLoadingVersions ? (
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>불러오는 중...</p>
        ) : versions.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>저장된 버전이 없습니다.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}
          >
            {versions.map((v) => (
              <li
                key={v.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "#f9fafb",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb"
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>v{v.revision}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => restoreVersion(v.id)}
                  disabled={isRestoring}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    background: isRestoring ? "#9ca3af" : "#374151",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: isRestoring ? "not-allowed" : "pointer"
                  }}
                >
                  복원
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- VersionHistoryDrawer
pnpm --filter @erdify/web typecheck
```

Expected: `2 passed`

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/editor/components/VersionHistoryDrawer.tsx \
        apps/web/src/features/editor/components/VersionHistoryDrawer.test.tsx
git commit -m "feat(editor): add VersionHistoryDrawer component"
```

---

## Task 6: Frontend — EditorPage 통합

**Files:**
- Modify: `apps/web/src/features/editor/EditorPage.tsx`

기존 EditorPage를 아래 내용으로 완전히 교체한다. 변경 사항:
- 기존 수동 Save 버튼 제거
- `useDiagramAutosave` 연결 (isDirty 상태에 따른 자동저장 상태 표시)
- "버전 저장" 버튼 (명시적 불변 버전 저장)
- "기록" 버튼 + `VersionHistoryDrawer` 토글

- [ ] **Step 1: EditorPage 교체**

`apps/web/src/features/editor/EditorPage.tsx` 를 아래로 교체:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addEntity } from "@erdify/domain";
import { getDiagram } from "../../shared/api/diagrams.api";
import { useEditorStore } from "./stores/useEditorStore";
import { EditorCanvas } from "./components/EditorCanvas";
import { VersionHistoryDrawer } from "./components/VersionHistoryDrawer";
import { useDiagramAutosave } from "./hooks/useDiagramAutosave";
import { useVersionHistory } from "./hooks/useVersionHistory";

export function EditorPage() {
  const { diagramId } = useParams<{ diagramId: string }>();
  const [showHistory, setShowHistory] = useState(false);
  const { document, isDirty, setDocument, applyCommand } = useEditorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["diagram", diagramId],
    queryFn: () => getDiagram(diagramId!),
    enabled: !!diagramId
  });

  useEffect(() => {
    if (data) setDocument(data.content);
  }, [data, setDocument]);

  useDiagramAutosave(diagramId!);

  const { saveVersion, isSavingVersion } = useVersionHistory(diagramId!);

  function handleAddTable() {
    applyCommand((doc) =>
      addEntity(doc, {
        id: crypto.randomUUID(),
        name: `Table_${doc.entities.length + 1}`
      })
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  const saveStatus = isDirty ? "수정됨" : "저장됨";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#ffffff"
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>{data?.name}</span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{saveStatus}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleAddTable}
          style={{
            padding: "4px 12px",
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13
          }}
        >
          + 테이블
        </button>
        <button
          onClick={() => saveVersion()}
          disabled={isSavingVersion}
          style={{
            padding: "4px 12px",
            background: isSavingVersion ? "#9ca3af" : "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: isSavingVersion ? "not-allowed" : "pointer",
            fontSize: 13
          }}
        >
          버전 저장
        </button>
        <button
          onClick={() => setShowHistory((v) => !v)}
          style={{
            padding: "4px 12px",
            background: showHistory ? "#2563eb" : "#f3f4f6",
            color: showHistory ? "#fff" : "#374151",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13
          }}
        >
          기록
        </button>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <EditorCanvas />
        {showHistory && diagramId && (
          <VersionHistoryDrawer diagramId={diagramId} onClose={() => setShowHistory(false)} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크 + 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test
pnpm --filter @erdify/web typecheck
```

Expected: 기존 테스트(App + LoginForm + EditorStore + VersionHistoryDrawer 등) 모두 통과

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/features/editor/EditorPage.tsx
git commit -m "feat(editor): wire autosave and version history into EditorPage"
```

---

## Task 7: 전체 품질 게이트 + Phase 4 마무리

- [ ] **Step 1: 전체 turbo 빌드**

```bash
pnpm turbo run test typecheck build
```

Expected: 모든 태스크 성공

- [ ] **Step 2: 최종 커밋**

```bash
git add .
git commit -m "chore: phase 4 quality gate pass"
```

---

## Self-Review

**스펙 커버리지 (Phase 4 항목):**
- Diagram snapshots: Task 2 + 6 (autosave가 매 3초마다 현재 상태 저장)
- Autosave: Task 3 (useDiagramAutosave)
- Immutable version save: Task 4 + 6 (saveVersion 버튼)
- Version restore: Task 1 + 4 + 5 (restoreVersion 엔드포인트 + 훅 + UI)

**Placeholder 검사:** 없음. 모든 단계에 실제 코드 포함.

**타입 일관성 확인:**
- `DiagramVersionResponse` — Task 2 API 클라이언트에서 정의, Task 4 훅과 Task 5 컴포넌트에서 동일하게 사용.
- `UseVersionHistoryResult` — Task 4 훅에서 export, Task 5 테스트에서 import.
- `restoreVersion(diagramId, versionId)` — Task 2에서 정의, Task 4 훅에서 호출, 시그니처 일치.
- `useDiagramAutosave(diagramId!, delayMs?)` — Task 3에서 정의, Task 6 EditorPage에서 `useDiagramAutosave(diagramId!)` 로 호출, 일치.

## Execution Choice

Plan saved to `docs/superpowers/plans/2026-04-30-erdify-phase-4-persistence-versions.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — 태스크별로 fresh subagent dispatch, 태스크 사이마다 리뷰

**2. Inline Execution** — 현재 세션에서 `executing-plans` 로 체크포인트 단위 실행

**Which approach?**

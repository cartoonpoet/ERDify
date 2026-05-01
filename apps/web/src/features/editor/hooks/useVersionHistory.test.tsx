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
      organizationId: "org-1",
      name: "restored",
      content: doc,
      createdBy: "user-1",
      createdAt: "2026-04-30T00:00:00Z",
      updatedAt: "2026-04-30T00:00:00Z",
      myRole: "editor" as const,
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

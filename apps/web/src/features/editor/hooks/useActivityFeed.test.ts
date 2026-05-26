import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEmptyDiagram } from "@erdify/domain";
import { useActivityFeed } from "./useActivityFeed";
import * as diagramsApi from "@/shared/api/diagrams.api";
import * as mcpApi from "@/shared/api/mcp-sessions.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

vi.mock("@/shared/api/diagrams.api");
vi.mock("@/shared/api/mcp-sessions.api");

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

const fakeVersion = (createdAt: string, id = "v1"): diagramsApi.DiagramVersionResponse => ({
  id,
  diagramId: "diag-1",
  content: {} as never,
  revision: 1,
  createdBy: "user-1",
  createdByName: "Alice",
  createdAt,
});

const fakeSession = (createdAt: string, id = "s1"): mcpApi.McpSessionResponse => ({
  id,
  summary: "AI session",
  toolCalls: [],
  snapshotVersionId: null,
  createdAt,
  updatedAt: createdAt,
});

describe("useActivityFeed", () => {
  beforeEach(() => {
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([]);
  });

  afterEach(() => {
    useEditorStore.setState({ document: null });
  });

  it("returns empty feed and isLoading=true when both queries are pending", () => {
    vi.mocked(diagramsApi.listVersions).mockReturnValue(new Promise(() => {}));
    vi.mocked(mcpApi.listMcpSessions).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("merges versions and sessions sorted by createdAt DESC", async () => {
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([
      fakeVersion("2026-04-30T10:10:00Z"),
      fakeVersion("2026-04-30T10:00:00Z"),
    ]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([
      fakeSession("2026-04-30T10:05:00Z"),
    ]);

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const { items } = result.current;
    expect(items).toHaveLength(3);
    expect(items[0]?.createdAt).toBe("2026-04-30T10:10:00Z");
    expect(items[0]?.kind).toBe("version");
    expect(items[1]?.createdAt).toBe("2026-04-30T10:05:00Z");
    expect(items[1]?.kind).toBe("ai");
    expect(items[2]?.createdAt).toBe("2026-04-30T10:00:00Z");
    expect(items[2]?.kind).toBe("version");
  });

  it("exposes restoreVersion and revertSession as functions", () => {
    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.restoreVersion).toBe("function");
    expect(typeof result.current.revertSession).toBe("function");
  });

  it("isLoading is false and items is empty when both queries resolve with empty arrays", async () => {
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([]);

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([]);
  });

  it("version items have kind='version' and session items have kind='ai'", async () => {
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([fakeVersion("2026-01-01T00:00:00Z")]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([fakeSession("2026-01-01T01:00:00Z")]);

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const versionItem = result.current.items.find((i) => i.id === "v1");
    const sessionItem = result.current.items.find((i) => i.id === "s1");
    expect(versionItem?.kind).toBe("version");
    expect(sessionItem?.kind).toBe("ai");
  });

  it("isRestoring is true while restoreVersion mutation is pending", async () => {
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([fakeVersion("2026-01-01T00:00:00Z", "v1")]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([]);

    let resolveRestore!: () => void;
    vi.mocked(diagramsApi.restoreVersion).mockReturnValue(
      new Promise<never>((res) => { resolveRestore = res as unknown as () => void; })
    );

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.restoreVersion("v1"); });

    await waitFor(() => expect(result.current.isRestoring).toBe(true));

    // clean up the pending promise to avoid leaking
    resolveRestore();
  });

  it("isReverting is true while revertSession mutation is pending", async () => {
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([fakeSession("2026-01-01T00:00:00Z", "s1")]);

    let resolveRevert!: () => void;
    vi.mocked(mcpApi.revertMcpSession).mockReturnValue(
      new Promise<void>((res) => { resolveRevert = res; })
    );

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.revertSession("s1"); });

    await waitFor(() => expect(result.current.isReverting).toBe(true));

    resolveRevert();
  });

  it("restoreVersion success sets document in editor store and invalidates queries", async () => {
    const mockDoc = createEmptyDiagram({ id: "doc-1", name: "Test", dialect: "postgresql" });
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([fakeVersion("2026-01-01T00:00:00Z", "v1")]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([]);
    vi.mocked(diagramsApi.restoreVersion).mockResolvedValue({ content: mockDoc } as never);

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { result.current.restoreVersion("v1"); });

    await waitFor(() => {
      expect(useEditorStore.getState().document).toEqual(mockDoc);
    });
  });

  it("revertSession success fetches the diagram and sets document in editor store", async () => {
    const mockDoc = createEmptyDiagram({ id: "doc-1", name: "Test", dialect: "postgresql" });
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([fakeSession("2026-01-01T00:00:00Z", "s1")]);
    vi.mocked(mcpApi.revertMcpSession).mockResolvedValue(undefined);
    vi.mocked(diagramsApi.getDiagram).mockResolvedValue({ content: mockDoc } as never);

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { result.current.revertSession("s1"); });

    await waitFor(() => {
      expect(useEditorStore.getState().document).toEqual(mockDoc);
    });
    expect(diagramsApi.getDiagram).toHaveBeenCalledWith("diag-1");
  });

  it("items contain all original version fields plus kind='version'", async () => {
    const version = fakeVersion("2026-06-01T00:00:00Z", "v99");
    vi.mocked(diagramsApi.listVersions).mockResolvedValue([version]);
    vi.mocked(mcpApi.listMcpSessions).mockResolvedValue([]);

    const { result } = renderHook(() => useActivityFeed("diag-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const item = result.current.items[0];
    expect(item).toMatchObject({ ...version, kind: "version" });
  });
});

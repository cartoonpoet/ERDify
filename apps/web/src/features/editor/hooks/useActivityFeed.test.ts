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
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

const fakeVersion = (createdAt: string): diagramsApi.DiagramVersionResponse => ({
  id: "v1",
  diagramId: "diag-1",
  content: {} as never,
  revision: 1,
  createdBy: "user-1",
  createdByName: "Alice",
  createdAt,
});

const fakeSession = (createdAt: string): mcpApi.McpSessionResponse => ({
  id: "s1",
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
});

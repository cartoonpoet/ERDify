import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMcpActivity } from "./useMcpActivity";
import { listMcpSessions, revertMcpSession } from "../../../shared/api/mcp-sessions.api";

vi.mock("../../../shared/api/mcp-sessions.api", () => ({
  listMcpSessions: vi.fn(),
  revertMcpSession: vi.fn(),
}));

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

describe("useMcpActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sessions: [] and isLoading: true initially", () => {
    vi.mocked(listMcpSessions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMcpActivity("diag-1"), {
      wrapper: createWrapper(),
    });
    expect(result.current.sessions).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns sessions array when query resolves", async () => {
    const sessions = [
      {
        id: "s1",
        summary: "Test",
        toolCalls: [],
        snapshotVersionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    vi.mocked(listMcpSessions).mockResolvedValue(sessions);
    const { result } = renderHook(() => useMcpActivity("diag-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.sessions).toEqual(sessions));
  });

  it("revertSession calls revertMcpSession(diagramId, sessionId) when invoked", async () => {
    vi.mocked(listMcpSessions).mockResolvedValue([]);
    vi.mocked(revertMcpSession).mockResolvedValue(undefined);
    const { result } = renderHook(() => useMcpActivity("diag-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    result.current.revertSession("sess-1");
    await waitFor(() =>
      expect(revertMcpSession).toHaveBeenCalledWith("diag-1", "sess-1")
    );
  });

  it("isReverting is false initially", () => {
    vi.mocked(listMcpSessions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMcpActivity("diag-1"), {
      wrapper: createWrapper(),
    });
    expect(result.current.isReverting).toBe(false);
  });
});

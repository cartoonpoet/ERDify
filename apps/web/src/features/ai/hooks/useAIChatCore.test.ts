import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAIChatCore } from "./useAIChatCore";
import { useAIChatStore } from "../store/useAIChatStore";
import { DEFAULT_SESSION_ID } from "../store/aiChatSlice";

vi.mock("../api/ai.api", () => ({
  getSessionMessages: vi.fn(),
  createSession: vi.fn(),
  sendAiChatStream: vi.fn(),
  acceptAiDiff: vi.fn(),
  rejectAiDiff: vi.fn(),
  getSessions: vi.fn().mockResolvedValue([]),
  getAiChatConfig: vi.fn().mockResolvedValue({ models: [] }),
}));

vi.mock("@/shared/utils/uuid", () => ({
  randomUUID: vi.fn().mockReturnValue("mock-uuid"),
}));

import { getSessionMessages, createSession } from "../api/ai.api";

const initialState = {
  isOpen: false,
  sessionMessages: {},
  isLoading: false,
  isSessionLoading: false,
  reviewingMessageId: null,
  currentSessionId: null,
  sessions: [],
  streamingStatus: null,
};

beforeEach(() => {
  useAIChatStore.setState(initialState);
  vi.mocked(getSessionMessages).mockReset();
  vi.mocked(createSession).mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("handleSelectSession — DEFAULT_SESSION_ID", () => {
  it("DEFAULT_SESSION_ID 선택 시 setCurrentSession만 호출하고 getSessionMessages 호출 안 함", async () => {
    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(DEFAULT_SESSION_ID);
    });

    expect(vi.mocked(getSessionMessages)).not.toHaveBeenCalled();
    expect(useAIChatStore.getState().currentSessionId).toBe(DEFAULT_SESSION_ID);
  });

  it("DEFAULT_SESSION_ID 선택 시 isSessionLoading이 false 유지됨", async () => {
    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(DEFAULT_SESSION_ID);
    });

    expect(useAIChatStore.getState().isSessionLoading).toBe(false);
  });
});

describe("handleSelectSession — 캐시 히트", () => {
  it("이미 sessionMessages에 해당 sessionId 데이터 있으면 getSessionMessages 호출 안 함", async () => {
    const cachedSessionId = "cached-session-1";
    useAIChatStore.setState({
      ...initialState,
      sessionMessages: {
        [cachedSessionId]: [
          {
            id: "msg-1",
            role: "user",
            content: "캐시된 메시지",
            diff: null,
            pendingDocument: null,
            accepted: null,
          },
        ],
      },
    });

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(cachedSessionId);
    });

    expect(vi.mocked(getSessionMessages)).not.toHaveBeenCalled();
  });

  it("캐시 히트 시에도 currentSessionId는 업데이트됨", async () => {
    const cachedSessionId = "cached-session-2";
    useAIChatStore.setState({
      ...initialState,
      sessionMessages: {
        [cachedSessionId]: [
          {
            id: "msg-2",
            role: "assistant",
            content: "캐시된 응답",
            diff: null,
            pendingDocument: null,
            accepted: null,
          },
        ],
      },
    });

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(cachedSessionId);
    });

    expect(useAIChatStore.getState().currentSessionId).toBe(cachedSessionId);
  });
});

describe("handleSelectSession — 정상 로드", () => {
  it("getSessionMessages 호출 성공 시 sessionMessages에 메시지 저장됨", async () => {
    const sessionId = "session-load-1";
    vi.mocked(getSessionMessages).mockResolvedValueOnce([
      {
        id: "hist-msg-1",
        role: "user",
        content: "안녕하세요",
        diff: null,
        accepted: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(sessionId);
    });

    const state = useAIChatStore.getState();
    const messages = state.sessionMessages[sessionId];
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(1);
    expect(messages![0]!.id).toBe("hist-msg-1");
    expect(messages![0]!.content).toBe("안녕하세요");
  });

  it("AiMessageHistoryItem → AiMessage 매핑 시 pendingDocument: null 추가됨", async () => {
    const sessionId = "session-load-2";
    vi.mocked(getSessionMessages).mockResolvedValueOnce([
      {
        id: "hist-msg-2",
        role: "assistant",
        content: "테이블을 추가했습니다",
        diff: [{ type: "addTable", tableId: "tbl-1", tableName: "users" }],
        accepted: true,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(sessionId);
    });

    const state = useAIChatStore.getState();
    const messages = state.sessionMessages[sessionId];
    expect(messages![0]!.pendingDocument).toBeNull();
    expect(messages![0]!.role).toBe("assistant");
    expect(messages![0]!.diff).toEqual([{ type: "addTable", tableId: "tbl-1", tableName: "users" }]);
    expect(messages![0]!.accepted).toBe(true);
  });

  it("로드 완료 후 isSessionLoading이 false로 완료됨", async () => {
    const sessionId = "session-load-3";
    vi.mocked(getSessionMessages).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(sessionId);
    });

    expect(useAIChatStore.getState().isSessionLoading).toBe(false);
  });
});

describe("handleSelectSession — isSessionLoading 토글", () => {
  it("로딩 중 isSessionLoading=true, 완료 후 isSessionLoading=false", async () => {
    const sessionId = "session-loading-toggle";
    let resolveMessages!: (value: []) => void;
    const messagesPromise = new Promise<[]>((resolve) => {
      resolveMessages = resolve;
    });
    vi.mocked(getSessionMessages).mockReturnValueOnce(messagesPromise);

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    act(() => {
      result.current.handleSelectSession(sessionId);
    });

    await waitFor(() => {
      expect(useAIChatStore.getState().isSessionLoading).toBe(true);
    });

    await act(async () => {
      resolveMessages([]);
    });

    await waitFor(() => {
      expect(useAIChatStore.getState().isSessionLoading).toBe(false);
    });
  });
});

describe("handleSelectSession — 에러 처리", () => {
  it("getSessionMessages 실패 시 에러 sentinel 메시지 삽입됨", async () => {
    const sessionId = "session-error-1";
    vi.mocked(getSessionMessages).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(sessionId);
    });

    const state = useAIChatStore.getState();
    const messages = state.sessionMessages[sessionId];
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(1);
  });

  it("에러 메시지 role=assistant, content에 '대화를 불러오지 못했습니다' 포함", async () => {
    const sessionId = "session-error-2";
    vi.mocked(getSessionMessages).mockRejectedValueOnce(new Error("Timeout"));

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(sessionId);
    });

    const state = useAIChatStore.getState();
    const messages = state.sessionMessages[sessionId];
    const errorMsg = messages![0]!;
    expect(errorMsg.role).toBe("assistant");
    expect(errorMsg.content).toContain("대화를 불러오지 못했습니다");
  });

  it("에러 후에도 isSessionLoading=false (finally 보장)", async () => {
    const sessionId = "session-error-3";
    vi.mocked(getSessionMessages).mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleSelectSession(sessionId);
    });

    expect(useAIChatStore.getState().isSessionLoading).toBe(false);
  });
});

describe("handleNewSession", () => {
  it("createSession 성공 시 sessions에 새 세션 추가되고 currentSessionId 설정됨", async () => {
    vi.mocked(createSession).mockResolvedValueOnce({ sessionId: "new-session-abc" });

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleNewSession();
    });

    const state = useAIChatStore.getState();
    expect(state.currentSessionId).toBe("new-session-abc");
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.id).toBe("new-session-abc");
  });

  it("새 세션 name은 '새 대화'", async () => {
    vi.mocked(createSession).mockResolvedValueOnce({ sessionId: "new-session-xyz" });

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await act(async () => {
      await result.current.handleNewSession();
    });

    const state = useAIChatStore.getState();
    expect(state.sessions[0]!.name).toBe("새 대화");
  });

  it("createSession 실패 시 예외 없이 무시됨", async () => {
    vi.mocked(createSession).mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useAIChatCore("diagram-1", ""));

    await expect(
      act(async () => {
        await result.current.handleNewSession();
      }),
    ).resolves.not.toThrow();

    const state = useAIChatStore.getState();
    expect(state.sessions).toHaveLength(0);
    expect(state.currentSessionId).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAIChatStore } from "./useAIChatStore";
import { DEFAULT_SESSION_ID } from "./aiChatSlice";

vi.mock("@/shared/utils/uuid", () => ({
  randomUUID: vi.fn(),
}));

import { randomUUID } from "@/shared/utils/uuid";

const getDefaultMessages = () =>
  useAIChatStore.getState().sessionMessages[DEFAULT_SESSION_ID] ?? [];

const initialState = {
  isOpen: false,
  sessionMessages: {},
  isLoading: false,
  isSessionLoading: false,
  reviewingMessageId: null,
};

beforeEach(() => {
  useAIChatStore.setState(initialState);
  vi.mocked(randomUUID).mockReset();
});

describe("useAIChatStore — openChat", () => {
  it("초기 메시지 없이 호출 시 isOpen=true, default 세션 메시지 없음", () => {
    useAIChatStore.getState().openChat();

    const state = useAIChatStore.getState();
    expect(state.isOpen).toBe(true);
    expect(getDefaultMessages()).toHaveLength(0);
  });

  it("초기 메시지와 함께 호출 시 isOpen=true, default 세션에 user 메시지 추가", () => {
    vi.mocked(randomUUID).mockReturnValueOnce("fixed-uuid-1");

    useAIChatStore.getState().openChat("안녕하세요");

    const state = useAIChatStore.getState();
    expect(state.isOpen).toBe(true);
    const messages = getDefaultMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      id: "fixed-uuid-1",
      role: "user",
      content: "안녕하세요",
      diff: null,
      pendingDocument: null,
      accepted: null,
    });
  });
});

describe("useAIChatStore — closeChat", () => {
  it("closeChat 호출 시 isOpen=false", () => {
    useAIChatStore.setState({ isOpen: true });

    useAIChatStore.getState().closeChat();

    expect(useAIChatStore.getState().isOpen).toBe(false);
  });
});

describe("useAIChatStore — addUserMessage", () => {
  it("user role 메시지가 default 세션에 추가된다", () => {
    vi.mocked(randomUUID).mockReturnValueOnce("fixed-uuid-2");

    useAIChatStore.getState().addUserMessage("테이블 추가해줘");

    const messages = getDefaultMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      id: "fixed-uuid-2",
      role: "user",
      content: "테이블 추가해줘",
      diff: null,
      pendingDocument: null,
      accepted: null,
    });
  });
});

describe("useAIChatStore — addAssistantMessage", () => {
  it("assistant role 메시지가 diff와 pendingDocument 포함하여 default 세션에 추가된다", () => {
    const mockResponse = {
      messageId: "server-msg-id",
      content: "테이블을 추가했습니다",
      diff: [{ type: "addTable" as const, tableId: "tbl-1", tableName: "users" }],
      pendingDocument: { tables: [], relations: [] } as any,
    };

    useAIChatStore.getState().addAssistantMessage(mockResponse);

    const messages = getDefaultMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      id: "server-msg-id",
      role: "assistant",
      content: "테이블을 추가했습니다",
      diff: mockResponse.diff,
      pendingDocument: mockResponse.pendingDocument,
      accepted: null,
    });
  });

  it("diff=null인 경우에도 메시지가 정상적으로 추가된다", () => {
    const mockResponse = {
      messageId: "server-msg-id-2",
      content: "안녕하세요!",
      diff: null,
      pendingDocument: null,
    };

    useAIChatStore.getState().addAssistantMessage(mockResponse);

    const messages = getDefaultMessages();
    expect(messages[0]!.diff).toBeNull();
    expect(messages[0]!.pendingDocument).toBeNull();
  });
});

describe("useAIChatStore — acceptDiff / rejectDiff", () => {
  beforeEach(() => {
    vi.mocked(randomUUID).mockReturnValueOnce("msg-accept-test");
    useAIChatStore.getState().addUserMessage("질문");

    useAIChatStore.getState().addAssistantMessage({
      messageId: "assistant-msg-1",
      content: "응답",
      diff: [{ type: "addTable" as const, tableId: "tbl-1", tableName: "users" }],
      pendingDocument: { tables: [], relations: [] } as any,
    });
  });

  it("acceptDiff(messageId) 호출 시 해당 메시지의 accepted=true", () => {
    useAIChatStore.getState().acceptDiff("assistant-msg-1");

    const msg = getDefaultMessages().find((m) => m.id === "assistant-msg-1");
    expect(msg?.accepted).toBe(true);
  });

  it("rejectDiff(messageId) 호출 시 해당 메시지의 accepted=false", () => {
    useAIChatStore.getState().rejectDiff("assistant-msg-1");

    const msg = getDefaultMessages().find((m) => m.id === "assistant-msg-1");
    expect(msg?.accepted).toBe(false);
  });

  it("다른 메시지의 accepted 상태는 변경되지 않는다", () => {
    useAIChatStore.getState().acceptDiff("assistant-msg-1");

    const userMsg = getDefaultMessages().find((m) => m.id === "msg-accept-test");
    expect(userMsg?.accepted).toBeNull();
  });
});

describe("useAIChatStore — setLoading", () => {
  it("setLoading(true) 호출 시 isLoading=true", () => {
    useAIChatStore.getState().setLoading(true);
    expect(useAIChatStore.getState().isLoading).toBe(true);
  });

  it("setLoading(false) 호출 시 isLoading=false", () => {
    useAIChatStore.setState({ isLoading: true });
    useAIChatStore.getState().setLoading(false);
    expect(useAIChatStore.getState().isLoading).toBe(false);
  });
});

describe("useAIChatStore — openReview / closeReview", () => {
  it("openReview(messageId) 호출 시 reviewingMessageId가 설정된다", () => {
    useAIChatStore.getState().openReview("review-msg-1");
    expect(useAIChatStore.getState().reviewingMessageId).toBe("review-msg-1");
  });

  it("closeReview() 호출 시 reviewingMessageId=null", () => {
    useAIChatStore.setState({ reviewingMessageId: "review-msg-1" });
    useAIChatStore.getState().closeReview();
    expect(useAIChatStore.getState().reviewingMessageId).toBeNull();
  });
});

describe("useAIChatStore — setSessionMessages", () => {
  it("setSessionMessages(sessionId, messages) 호출 시 sessionMessages[sessionId]가 설정된다", () => {
    const messages = [
      {
        id: "msg-1",
        role: "user" as const,
        content: "안녕",
        diff: null,
        pendingDocument: null,
        accepted: null,
      },
      {
        id: "msg-2",
        role: "assistant" as const,
        content: "안녕하세요!",
        diff: null,
        pendingDocument: null,
        accepted: null,
      },
    ];

    useAIChatStore.getState().setSessionMessages("sess-1", messages);

    const state = useAIChatStore.getState();
    expect(state.sessionMessages["sess-1"]).toEqual(messages);
  });

  it("기존 다른 세션 메시지는 유지하면서 새 세션 메시지를 추가한다", () => {
    vi.mocked(randomUUID).mockReturnValueOnce("existing-msg");
    useAIChatStore.getState().addUserMessage("기존 메시지", "existing-sess");

    const newMessages = [
      {
        id: "new-msg-1",
        role: "user" as const,
        content: "새 세션 메시지",
        diff: null,
        pendingDocument: null,
        accepted: null,
      },
    ];
    useAIChatStore.getState().setSessionMessages("new-sess", newMessages);

    const state = useAIChatStore.getState();
    expect(state.sessionMessages["existing-sess"]).toHaveLength(1);
    expect(state.sessionMessages["new-sess"]).toEqual(newMessages);
  });

  it("빈 배열로 setSessionMessages 호출 시 세션 메시지가 빈 배열로 설정된다", () => {
    useAIChatStore.getState().setSessionMessages("empty-sess", []);

    const state = useAIChatStore.getState();
    expect(state.sessionMessages["empty-sess"]).toEqual([]);
    expect(state.sessionMessages["empty-sess"]).not.toBeUndefined();
  });
});

describe("useAIChatStore — setIsSessionLoading", () => {
  it("setIsSessionLoading(true) 호출 시 isSessionLoading=true", () => {
    useAIChatStore.getState().setIsSessionLoading(true);
    expect(useAIChatStore.getState().isSessionLoading).toBe(true);
  });

  it("setIsSessionLoading(false) 호출 시 isSessionLoading=false", () => {
    useAIChatStore.setState({ isSessionLoading: true });
    useAIChatStore.getState().setIsSessionLoading(false);
    expect(useAIChatStore.getState().isSessionLoading).toBe(false);
  });

  it("초기 isSessionLoading은 false이다", () => {
    expect(useAIChatStore.getState().isSessionLoading).toBe(false);
  });
});

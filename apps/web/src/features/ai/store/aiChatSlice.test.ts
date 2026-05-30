import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAIChatStore } from "./useAIChatStore";

vi.mock("@/shared/utils/uuid", () => ({
  randomUUID: vi.fn(),
}));

import { randomUUID } from "@/shared/utils/uuid";

const initialState = {
  isOpen: false,
  messages: [],
  isLoading: false,
  reviewingMessageId: null,
};

beforeEach(() => {
  useAIChatStore.setState(initialState);
  vi.mocked(randomUUID).mockReset();
});

describe("useAIChatStore — openChat", () => {
  it("초기 메시지 없이 호출 시 isOpen=true, messages=[] 유지", () => {
    useAIChatStore.getState().openChat();

    const state = useAIChatStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.messages).toHaveLength(0);
  });

  it("초기 메시지와 함께 호출 시 isOpen=true, messages에 user 메시지 추가", () => {
    vi.mocked(randomUUID).mockReturnValueOnce("fixed-uuid-1");

    useAIChatStore.getState().openChat("안녕하세요");

    const state = useAIChatStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toEqual({
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
  it("user role 메시지가 messages에 추가된다", () => {
    vi.mocked(randomUUID).mockReturnValueOnce("fixed-uuid-2");

    useAIChatStore.getState().addUserMessage("테이블 추가해줘");

    const { messages } = useAIChatStore.getState();
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

describe("useAIChatStore — resetForDiagram / loadHistory", () => {
  it("resetForDiagram은 diagramId를 설정하고 메시지/스트리밍 상태를 비운다", () => {
    useAIChatStore.setState({ messages: [{ id: "x", role: "user", content: "old", diff: null, pendingDocument: null, accepted: null }], streamingText: "abc", isLoading: true });

    useAIChatStore.getState().resetForDiagram("diag-2");

    const s = useAIChatStore.getState();
    expect(s.diagramId).toBe("diag-2");
    expect(s.messages).toHaveLength(0);
    expect(s.streamingText).toBe("");
    expect(s.isLoading).toBe(false);
  });

  it("loadHistory는 같은 diagramId이고 메시지가 비어있을 때 복원한다 (diff는 읽기 전용 — pendingDocument=null)", () => {
    useAIChatStore.getState().resetForDiagram("diag-2");
    useAIChatStore.getState().loadHistory("diag-2", [
      { id: "h1", role: "user", content: "질문", diff: null, accepted: null },
      { id: "h2", role: "assistant", content: "답변", diff: [{ type: "addTable", tableId: "t", tableName: "users" }], accepted: true },
    ]);

    const msgs = useAIChatStore.getState().messages;
    expect(msgs.map((m) => m.id)).toEqual(["h1", "h2"]);
    expect(msgs[1]!.pendingDocument).toBeNull();
    expect(msgs[1]!.accepted).toBe(true);
  });

  it("loadHistory는 diagramId가 다르면 무시한다 (전환 레이스 방지)", () => {
    useAIChatStore.getState().resetForDiagram("diag-2");
    useAIChatStore.getState().loadHistory("diag-OTHER", [{ id: "h1", role: "user", content: "질문", diff: null, accepted: null }]);
    expect(useAIChatStore.getState().messages).toHaveLength(0);
  });

  it("loadHistory는 이미 메시지가 있으면 덮어쓰지 않는다", () => {
    useAIChatStore.getState().resetForDiagram("diag-2");
    useAIChatStore.getState().addUserMessage("새 질문");
    useAIChatStore.getState().loadHistory("diag-2", [{ id: "h1", role: "user", content: "지난 질문", diff: null, accepted: null }]);
    const msgs = useAIChatStore.getState().messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.content).toBe("새 질문");
  });
});

describe("useAIChatStore — finishAssistantStream", () => {
  it("assistant role 메시지가 diff와 pendingDocument 포함하여 추가되고 스트리밍 상태가 초기화된다", () => {
    const msg = {
      messageId: "server-msg-id",
      content: "테이블을 추가했습니다",
      diff: [{ type: "addTable" as const, tableId: "tbl-1", tableName: "users" }],
      pendingDocument: { tables: [], relations: [] } as any,
    };

    useAIChatStore.getState().startAssistantStream();
    useAIChatStore.getState().appendStreamText("테이블을");
    useAIChatStore.getState().finishAssistantStream(msg);

    const state = useAIChatStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toEqual({
      id: "server-msg-id",
      role: "assistant",
      content: "테이블을 추가했습니다",
      diff: msg.diff,
      pendingDocument: msg.pendingDocument,
      accepted: null,
    });
    expect(state.isLoading).toBe(false);
    expect(state.streamingText).toBe("");
    expect(state.streamingStatus).toBeNull();
  });

  it("diff=null인 경우에도 메시지가 정상적으로 추가된다", () => {
    useAIChatStore.getState().finishAssistantStream({
      messageId: "server-msg-id-2",
      content: "안녕하세요!",
      diff: null,
      pendingDocument: null,
    });

    const { messages } = useAIChatStore.getState();
    expect(messages[0]!.diff).toBeNull();
    expect(messages[0]!.pendingDocument).toBeNull();
  });
});

describe("useAIChatStore — acceptDiff / rejectDiff", () => {
  beforeEach(() => {
    vi.mocked(randomUUID).mockReturnValueOnce("msg-accept-test");
    useAIChatStore.getState().addUserMessage("질문");

    useAIChatStore.getState().finishAssistantStream({
      messageId: "assistant-msg-1",
      content: "응답",
      diff: [{ type: "addTable" as const, tableId: "tbl-1", tableName: "users" }],
      pendingDocument: { tables: [], relations: [] } as any,
    });
  });

  it("acceptDiff(messageId) 호출 시 해당 메시지의 accepted=true", () => {
    useAIChatStore.getState().acceptDiff("assistant-msg-1");

    const msg = useAIChatStore.getState().messages.find((m) => m.id === "assistant-msg-1");
    expect(msg?.accepted).toBe(true);
  });

  it("rejectDiff(messageId) 호출 시 해당 메시지의 accepted=false", () => {
    useAIChatStore.getState().rejectDiff("assistant-msg-1");

    const msg = useAIChatStore.getState().messages.find((m) => m.id === "assistant-msg-1");
    expect(msg?.accepted).toBe(false);
  });

  it("다른 메시지의 accepted 상태는 변경되지 않는다", () => {
    useAIChatStore.getState().acceptDiff("assistant-msg-1");

    const userMsg = useAIChatStore.getState().messages.find((m) => m.id === "msg-accept-test");
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

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FloatingAIChat } from "./FloatingAIChat";
import { useAIChatStore } from "../store/useAIChatStore";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { DEFAULT_SESSION_ID } from "../store/aiChatSlice";
import type { DiagramDocument } from "@erdify/domain";

vi.mock("../api/ai.api", () => ({
  sendAiChatStream: vi.fn(),
  acceptAiDiff: vi.fn(),
  rejectAiDiff: vi.fn(),
  getSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  getAiChatConfig: vi.fn().mockResolvedValue({ models: [] }),
}));

vi.mock("@/shared/utils/uuid", () => ({
  randomUUID: vi.fn(),
}));

vi.mock("./AIDiffReviewPanel", () => ({
  AIDiffReviewPanel: ({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) => (
    <div data-testid="ai-diff-review-panel">
      <button type="button" onClick={onAccept}>수락</button>
      <button type="button" onClick={onReject}>거절</button>
    </div>
  ),
}));

vi.mock("./MessageBubble", () => ({
  MessageBubble: ({ message }: { message: { content: string } }) => (
    <div data-testid="message-bubble">{message.content}</div>
  ),
}));

import { sendAiChatStream, acceptAiDiff, rejectAiDiff, createSession, getAiChatConfig } from "../api/ai.api";
import { randomUUID } from "@/shared/utils/uuid";
import * as floatingCss from "./FloatingAIChat.css";

const makeEmptyDoc = (id = "doc-1"): DiagramDocument => ({
  format: "erdify.schema.v1",
  id,
  name: "Test",
  dialect: "postgresql",
  entities: [],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
});

const initialAiChatState = {
  isOpen: false,
  sessionMessages: {},
  isLoading: false,
  reviewingMessageId: null,
  currentSessionId: null,
  sessions: [],
};

beforeEach(() => {
  useAIChatStore.setState(initialAiChatState);
  localStorage.clear();
  vi.mocked(randomUUID).mockReset();
  vi.mocked(sendAiChatStream).mockReset();
  vi.mocked(acceptAiDiff).mockReset();
  vi.mocked(rejectAiDiff).mockReset();
  vi.mocked(createSession).mockReset();
  vi.mocked(getAiChatConfig).mockReset();
  vi.mocked(getAiChatConfig).mockResolvedValue({ models: [] });
  Element.prototype.scrollIntoView = vi.fn();
});

describe("FloatingAIChat", () => {
  it("초기 상태에서 isOpen=false이고 FAB 라벨(AI)과 컨테이너가 렌더링된다", () => {
    render(<FloatingAIChat diagramId="diagram-1" />);

    // store 상태 확인
    expect(useAIChatStore.getState().isOpen).toBe(false);
    // FAB 라벨 "AI"가 보임
    expect(screen.getByText("AI")).toBeInTheDocument();
    // ERDify AI 텍스트도 존재 (채팅 헤더는 DOM에 있지만 CSS로 숨겨짐)
    expect(screen.getByText("ERDify AI")).toBeInTheDocument();
  });

  it("FAB 컨테이너 클릭 시 채팅 입력창과 전송 버튼이 나타난다", () => {
    render(<FloatingAIChat diagramId="diagram-1" />);

    // isOpen=false 상태에서 컨테이너 클릭 → openChat 호출
    const container = screen.getByText("AI").closest("div")!.parentElement!;
    fireEvent.click(container);

    expect(useAIChatStore.getState().isOpen).toBe(true);
    expect(screen.getByPlaceholderText("메시지 입력 (Enter 전송)")).toBeInTheDocument();
  });

  it("채팅창 열린 상태에서 닫기 버튼 클릭 시 isOpen=false가 된다", () => {
    useAIChatStore.setState({ ...initialAiChatState, isOpen: true });

    render(<FloatingAIChat diagramId="diagram-1" />);

    fireEvent.click(screen.getByRole("button", { name: "×" }));

    expect(useAIChatStore.getState().isOpen).toBe(false);
  });

  it("세션이 없을 때 메시지 전송 시 createSession → sendAiChatStream 순서로 호출된다", async () => {
    vi.mocked(randomUUID).mockReturnValue("user-msg-uuid");
    vi.mocked(createSession).mockResolvedValueOnce({ sessionId: "new-session-id" });
    vi.mocked(sendAiChatStream).mockImplementation(async ({ onDone }) => {
      onDone({ messageId: "assistant-msg-id", diff: null, pendingDocument: null });
    });

    useAIChatStore.setState({ ...initialAiChatState, isOpen: true });

    render(<FloatingAIChat diagramId="diagram-1" />);

    const textarea = screen.getByPlaceholderText("메시지 입력 (Enter 전송)");
    fireEvent.change(textarea, { target: { value: "테이블 추가해줘" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "↑" }));
    });

    await waitFor(() => {
      expect(vi.mocked(createSession)).toHaveBeenCalledWith("diagram-1");
      expect(vi.mocked(sendAiChatStream)).toHaveBeenCalledWith({
        diagramId: "diagram-1",
        message: "테이블 추가해줘",
        sessionId: "new-session-id",
        model: "",
        onText: expect.any(Function),
        onDone: expect.any(Function),
        onError: expect.any(Function),
        onStatus: expect.any(Function),
      });
    });

    const state = useAIChatStore.getState();
    const messages = state.sessionMessages["new-session-id"] ?? [];
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0]!.role).toBe("user");
    expect(messages[0]!.content).toBe("테이블 추가해줘");
  });

  it("sendAiChatStream onError 호출 시 에러 메시지가 sessionMessages에 추가된다", async () => {
    vi.mocked(randomUUID).mockReturnValue("error-msg-uuid");
    vi.mocked(createSession).mockResolvedValueOnce({ sessionId: "session-err" });
    vi.mocked(sendAiChatStream).mockImplementation(async ({ onError }) => {
      onError("Network error");
    });

    useAIChatStore.setState({ ...initialAiChatState, isOpen: true });

    render(<FloatingAIChat diagramId="diagram-1" />);

    const textarea = screen.getByPlaceholderText("메시지 입력 (Enter 전송)");
    fireEvent.change(textarea, { target: { value: "질문" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "↑" }));
    });

    await waitFor(() => {
      const state = useAIChatStore.getState();
      const messages = state.sessionMessages["session-err"] ?? [];
      const errorMsg = messages.find((m) => m.role === "assistant");
      expect(errorMsg?.content).toContain("오류가 발생했습니다");
    });
  });

  it("reviewingMessageId가 있고 해당 메시지에 diff와 pendingDocument가 있을 때 AIDiffReviewPanel을 렌더링한다", () => {
    const pendingDoc = makeEmptyDoc("pending-doc");
    const reviewMsgId = "review-msg-1";

    useAIChatStore.setState({
      ...initialAiChatState,
      isOpen: true,
      reviewingMessageId: reviewMsgId,
      sessionMessages: {
        [DEFAULT_SESSION_ID]: [
          {
            id: reviewMsgId,
            role: "assistant",
            content: "스키마 변경 제안",
            diff: [{ type: "addTable", tableId: "tbl-1", tableName: "users" }],
            pendingDocument: pendingDoc,
            accepted: null,
          },
        ],
      },
    });

    render(<FloatingAIChat diagramId="diagram-1" />);

    expect(screen.getByTestId("ai-diff-review-panel")).toBeInTheDocument();
  });

  it("handleAccept 클릭 시 acceptDiff + closeReview + acceptAiDiff가 호출되고 setDocument가 실행된다", async () => {
    const pendingDoc = makeEmptyDoc("pending-doc");
    const reviewMsgId = "review-msg-accept";

    vi.mocked(acceptAiDiff).mockResolvedValueOnce(undefined);

    useAIChatStore.setState({
      ...initialAiChatState,
      isOpen: true,
      reviewingMessageId: reviewMsgId,
      sessionMessages: {
        [DEFAULT_SESSION_ID]: [
          {
            id: reviewMsgId,
            role: "assistant",
            content: "스키마 변경 제안",
            diff: [{ type: "addTable", tableId: "tbl-1", tableName: "users" }],
            pendingDocument: pendingDoc,
            accepted: null,
          },
        ],
      },
    });

    render(<FloatingAIChat diagramId="diagram-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "수락" }));
    });

    await waitFor(() => {
      expect(vi.mocked(acceptAiDiff)).toHaveBeenCalledWith(reviewMsgId);
    });

    const state = useAIChatStore.getState();
    const allMessages = Object.values(state.sessionMessages).flat();
    const acceptedMsg = allMessages.find((m) => m.id === reviewMsgId);
    expect(acceptedMsg?.accepted).toBe(true);
    expect(state.reviewingMessageId).toBeNull();

    expect(useEditorStore.getState().document).toEqual(pendingDoc);
  });

  it("handleReject 클릭 시 rejectDiff + closeReview + rejectAiDiff가 호출된다", async () => {
    const pendingDoc = makeEmptyDoc("pending-doc");
    const reviewMsgId = "review-msg-reject";

    vi.mocked(rejectAiDiff).mockResolvedValueOnce(undefined);

    useAIChatStore.setState({
      ...initialAiChatState,
      isOpen: true,
      reviewingMessageId: reviewMsgId,
      sessionMessages: {
        [DEFAULT_SESSION_ID]: [
          {
            id: reviewMsgId,
            role: "assistant",
            content: "스키마 변경 제안",
            diff: [{ type: "addTable", tableId: "tbl-1", tableName: "users" }],
            pendingDocument: pendingDoc,
            accepted: null,
          },
        ],
      },
    });

    render(<FloatingAIChat diagramId="diagram-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "거절" }));
    });

    await waitFor(() => {
      expect(vi.mocked(rejectAiDiff)).toHaveBeenCalledWith(reviewMsgId);
    });

    const state = useAIChatStore.getState();
    const allMessages = Object.values(state.sessionMessages).flat();
    const rejectedMsg = allMessages.find((m) => m.id === reviewMsgId);
    expect(rejectedMsg?.accepted).toBe(false);
    expect(state.reviewingMessageId).toBeNull();
  });
});

describe("FloatingAIChat — FAB 키보드 접근성", () => {
  it("닫힘 상태에서 FAB에 Enter 키 입력 시 채팅이 열린다", () => {
    render(<FloatingAIChat diagramId="diagram-1" />);

    fireEvent.keyDown(screen.getByRole("button", { name: "AI 채팅 열기" }), { key: "Enter" });

    expect(useAIChatStore.getState().isOpen).toBe(true);
  });

  it("닫힘 상태에서 FAB에 Space 키 입력 시 채팅이 열린다", () => {
    render(<FloatingAIChat diagramId="diagram-1" />);

    fireEvent.keyDown(screen.getByRole("button", { name: "AI 채팅 열기" }), { key: " " });

    expect(useAIChatStore.getState().isOpen).toBe(true);
  });

  it("Enter/Space 이외의 키 입력으로는 채팅이 열리지 않는다", () => {
    render(<FloatingAIChat diagramId="diagram-1" />);

    fireEvent.keyDown(screen.getByRole("button", { name: "AI 채팅 열기" }), { key: "Escape" });

    expect(useAIChatStore.getState().isOpen).toBe(false);
  });
});

describe("FloatingAIChat — 모델 드롭다운", () => {
  const TEST_MODELS = [
    { provider: "anthropic" as const, value: "claude-sonnet-5", label: "Claude Sonnet 5 (권장)" },
    { provider: "openai" as const, value: "gpt-4o", label: "GPT-4o (권장)" },
  ];

  /** 채팅을 연 상태로 렌더링하고 모델 버튼이 나타날 때까지 기다린다. */
  const renderWithModels = async () => {
    vi.mocked(getAiChatConfig).mockResolvedValue({ models: TEST_MODELS });
    useAIChatStore.setState({ ...initialAiChatState, isOpen: true });
    render(<FloatingAIChat diagramId="diagram-1" />);
    return await screen.findByRole("button", { name: /Claude Sonnet 5/ });
  };

  it("모델 버튼 클릭 시 드롭다운이 열리고 aria-expanded가 갱신된다", async () => {
    const modelBtn = await renderWithModels();
    expect(modelBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(modelBtn);

    expect(modelBtn).toHaveAttribute("aria-expanded", "true");
    // 프로바이더 그룹 라벨과 모델 항목이 표시된다
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GPT-4o 권장" })).toBeInTheDocument();
  });

  it("모델 버튼에서 Enter/Space 키로 드롭다운을 토글하고 다른 키는 무시한다", async () => {
    const modelBtn = await renderWithModels();

    fireEvent.keyDown(modelBtn, { key: "Enter" });
    expect(modelBtn).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(modelBtn, { key: " " });
    expect(modelBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(modelBtn, { key: "Escape" });
    expect(modelBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("드롭다운 항목 클릭 시 모델이 선택되고 드롭다운이 닫힌다", async () => {
    const modelBtn = await renderWithModels();
    fireEvent.click(modelBtn);

    fireEvent.click(screen.getByRole("button", { name: "GPT-4o 권장" }));

    expect(modelBtn).toHaveAttribute("aria-expanded", "false");
    expect(modelBtn).toHaveTextContent("GPT-4o");
    expect(localStorage.getItem("erdify.ai.model")).toBe("gpt-4o");
  });

  it("드롭다운 항목에서 Enter 키로 모델을 선택하면 전파가 막혀 드롭다운이 다시 열리지 않는다", async () => {
    const modelBtn = await renderWithModels();
    fireEvent.click(modelBtn);

    fireEvent.keyDown(screen.getByRole("button", { name: "GPT-4o 권장" }), { key: "Enter" });

    // stopPropagation이 없다면 모델 버튼 keydown 핸들러가 다시 토글해 열린 상태가 된다
    expect(modelBtn).toHaveAttribute("aria-expanded", "false");
    expect(localStorage.getItem("erdify.ai.model")).toBe("gpt-4o");
  });

  it("드롭다운 항목에서 Space 키로도 모델을 선택할 수 있고 다른 키는 무시된다", async () => {
    const modelBtn = await renderWithModels();
    fireEvent.click(modelBtn);

    fireEvent.keyDown(screen.getByRole("button", { name: "GPT-4o 권장" }), { key: "Tab" });
    expect(modelBtn).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(screen.getByRole("button", { name: "GPT-4o 권장" }), { key: " " });
    expect(modelBtn).toHaveAttribute("aria-expanded", "false");
    expect(localStorage.getItem("erdify.ai.model")).toBe("gpt-4o");
  });

  it("드롭다운 내부(프로바이더 라벨) 클릭은 토글로 전파되지 않아 드롭다운이 유지된다", async () => {
    const modelBtn = await renderWithModels();
    fireEvent.click(modelBtn);

    fireEvent.click(screen.getByText("Anthropic"));

    expect(modelBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("백드롭 클릭 시 드롭다운이 닫힌다", async () => {
    const modelBtn = await renderWithModels();
    fireEvent.click(modelBtn);

    const backdrop = document.querySelector(`.${floatingCss.modelDropdownBackdrop}`);
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(modelBtn).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(`.${floatingCss.modelDropdownBackdrop}`)).toBeNull();
  });
});

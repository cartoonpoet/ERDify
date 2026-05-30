import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FloatingAIChat } from "./FloatingAIChat";
import { useAIChatStore } from "../store/useAIChatStore";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { DiagramDocument } from "@erdify/domain";

vi.mock("../api/ai.api", () => ({
  streamAiChat: vi.fn(),
  acceptAiDiff: vi.fn(),
  rejectAiDiff: vi.fn(),
  getAiChatHistory: vi.fn(),
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

import { streamAiChat, acceptAiDiff, rejectAiDiff, getAiChatHistory } from "../api/ai.api";
import type { AiStreamEvent } from "@erdify/contracts";
import { randomUUID } from "@/shared/utils/uuid";

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
  diagramId: "diagram-1",
  messages: [],
  isLoading: false,
  reviewingMessageId: null,
};

beforeEach(() => {
  useAIChatStore.setState(initialAiChatState);
  vi.mocked(randomUUID).mockReset();
  vi.mocked(streamAiChat).mockReset();
  vi.mocked(acceptAiDiff).mockReset();
  vi.mocked(rejectAiDiff).mockReset();
  vi.mocked(getAiChatHistory).mockReset();
  vi.mocked(getAiChatHistory).mockResolvedValue([]);
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

  it("메시지 전송 시 addUserMessage → streamAiChat → done 이벤트로 assistant 메시지가 추가된다", async () => {
    vi.mocked(streamAiChat).mockImplementationOnce(async (_diagramId, _message, onEvent) => {
      const events: AiStreamEvent[] = [
        { type: "step", text: "AI 응답입니다" },
        { type: "done", messageId: "assistant-msg-id", content: "AI 응답입니다", diff: null, pendingDocument: null },
      ];
      for (const e of events) onEvent(e);
    });

    useAIChatStore.setState({ ...initialAiChatState, isOpen: true });

    render(<FloatingAIChat diagramId="diagram-1" />);

    const textarea = screen.getByPlaceholderText("메시지 입력 (Enter 전송)");
    fireEvent.change(textarea, { target: { value: "테이블 추가해줘" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "↑" }));
    });

    await waitFor(() => {
      expect(vi.mocked(streamAiChat)).toHaveBeenCalledWith("diagram-1", "테이블 추가해줘", expect.any(Function));
    });

    const messages = useAIChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("user");
    expect(messages[0]!.content).toBe("테이블 추가해줘");
    expect(messages[1]!.role).toBe("assistant");
    expect(messages[1]!.content).toBe("AI 응답입니다");
  });

  it("streamAiChat 실패 시 에러 메시지가 messages에 추가된다", async () => {
    vi.mocked(randomUUID).mockReturnValueOnce("error-msg-uuid");
    vi.mocked(streamAiChat).mockRejectedValueOnce(new Error("Network error"));

    useAIChatStore.setState({ ...initialAiChatState, isOpen: true });

    render(<FloatingAIChat diagramId="diagram-1" />);

    const textarea = screen.getByPlaceholderText("메시지 입력 (Enter 전송)");
    fireEvent.change(textarea, { target: { value: "질문" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "↑" }));
    });

    await waitFor(() => {
      const messages = useAIChatStore.getState().messages;
      expect(messages).toHaveLength(2);
      expect(messages[1]!.role).toBe("assistant");
      expect(messages[1]!.content).toBe("오류가 발생했습니다. 다시 시도해주세요.");
    });
  });

  it("다른 다이어그램으로 진입하면 채팅을 초기화하고 저장된 대화를 복원한다", async () => {
    vi.mocked(getAiChatHistory).mockResolvedValueOnce([
      { id: "hist-1", role: "user", content: "지난 질문", diff: null, accepted: null },
      { id: "hist-2", role: "assistant", content: "지난 답변", diff: null, accepted: null },
    ]);
    useAIChatStore.setState({ ...initialAiChatState, diagramId: "diagram-1", isOpen: true });

    await act(async () => {
      render(<FloatingAIChat diagramId="diagram-2" />);
    });

    await waitFor(() => {
      expect(vi.mocked(getAiChatHistory)).toHaveBeenCalledWith("diagram-2");
    });
    await waitFor(() => {
      const state = useAIChatStore.getState();
      expect(state.diagramId).toBe("diagram-2");
      expect(state.messages.map((m) => m.content)).toEqual(["지난 질문", "지난 답변"]);
    });
  });

  it("reviewingMessageId가 있고 해당 메시지에 diff와 pendingDocument가 있을 때 AIDiffReviewPanel을 렌더링한다", () => {
    const pendingDoc = makeEmptyDoc("pending-doc");
    const reviewMsgId = "review-msg-1";

    useAIChatStore.setState({
      ...initialAiChatState,
      isOpen: true,
      reviewingMessageId: reviewMsgId,
      messages: [
        {
          id: reviewMsgId,
          role: "assistant",
          content: "스키마 변경 제안",
          diff: [{ type: "addTable", tableId: "tbl-1", tableName: "users" }],
          pendingDocument: pendingDoc,
          accepted: null,
        },
      ],
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
      messages: [
        {
          id: reviewMsgId,
          role: "assistant",
          content: "스키마 변경 제안",
          diff: [{ type: "addTable", tableId: "tbl-1", tableName: "users" }],
          pendingDocument: pendingDoc,
          accepted: null,
        },
      ],
    });

    render(<FloatingAIChat diagramId="diagram-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "수락" }));
    });

    await waitFor(() => {
      expect(vi.mocked(acceptAiDiff)).toHaveBeenCalledWith(reviewMsgId);
    });

    const state = useAIChatStore.getState();
    const acceptedMsg = state.messages.find((m) => m.id === reviewMsgId);
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
      messages: [
        {
          id: reviewMsgId,
          role: "assistant",
          content: "스키마 변경 제안",
          diff: [{ type: "addTable", tableId: "tbl-1", tableName: "users" }],
          pendingDocument: pendingDoc,
          accepted: null,
        },
      ],
    });

    render(<FloatingAIChat diagramId="diagram-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "거절" }));
    });

    await waitFor(() => {
      expect(vi.mocked(rejectAiDiff)).toHaveBeenCalledWith(reviewMsgId);
    });

    const state = useAIChatStore.getState();
    const rejectedMsg = state.messages.find((m) => m.id === reviewMsgId);
    expect(rejectedMsg?.accepted).toBe(false);
    expect(state.reviewingMessageId).toBeNull();
  });
});

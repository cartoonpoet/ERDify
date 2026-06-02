import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIChatTabPanel } from "./AIChatTabPanel";
import { useAIChatStore } from "@/features/ai/store/useAIChatStore";
import { DEFAULT_SESSION_ID } from "@/features/ai/store/aiChatSlice";

vi.mock("@/features/ai/api/ai.api", () => ({
  sendAiChatStream: vi.fn(),
  acceptAiDiff: vi.fn(),
  rejectAiDiff: vi.fn(),
  getSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  getAiChatConfig: vi.fn().mockResolvedValue({ models: [] }),
  getSessionMessages: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/shared/utils/uuid", () => ({
  randomUUID: vi.fn().mockReturnValue("mock-uuid"),
}));

vi.mock("@/features/ai/components/AIDiffReviewPanel", () => ({
  AIDiffReviewPanel: () => <div data-testid="ai-diff-review-panel" />,
}));

vi.mock("@/features/ai/components/MessageBubble", () => ({
  MessageBubble: ({ message }: { message: { content: string } }) => (
    <div data-testid="message-bubble">{message.content}</div>
  ),
}));

const initialAiChatState = {
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
  useAIChatStore.setState(initialAiChatState);
  Element.prototype.scrollIntoView = vi.fn();
});

describe("AIChatTabPanel — 기본 렌더링", () => {
  it("기본 렌더링 시 'ERDify AI' 헤더 텍스트가 있다", () => {
    render(<AIChatTabPanel diagramId="diagram-1" />);

    expect(screen.getByText("ERDify AI")).toBeInTheDocument();
  });

  it("메시지 입력창과 전송 버튼이 있다", () => {
    render(<AIChatTabPanel diagramId="diagram-1" />);

    expect(screen.getByPlaceholderText("메시지 입력 (Enter 전송)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "↑" })).toBeInTheDocument();
  });

  it("빈 상태에서 'ERD에 대해 무엇이든 물어보세요' 안내 메시지가 있다", () => {
    render(<AIChatTabPanel diagramId="diagram-1" />);

    expect(screen.getByText(/ERD에 대해 무엇이든 물어보세요/)).toBeInTheDocument();
  });
});

describe("AIChatTabPanel — isSessionLoading UI", () => {
  it("isSessionLoading=true 시 '대화를 불러오는 중...' 로딩 인디케이터가 보인다", () => {
    useAIChatStore.setState({ ...initialAiChatState, isSessionLoading: true });

    render(<AIChatTabPanel diagramId="diagram-1" />);

    expect(screen.getByText(/대화를 불러오는 중/)).toBeInTheDocument();
  });

  it("isSessionLoading=true 시 빈 상태 메시지가 보이지 않는다", () => {
    useAIChatStore.setState({ ...initialAiChatState, isSessionLoading: true });

    render(<AIChatTabPanel diagramId="diagram-1" />);

    expect(screen.queryByText(/ERD에 대해 무엇이든 물어보세요/)).not.toBeInTheDocument();
  });

  it("isSessionLoading=false 시 메시지 목록 영역이 보인다", () => {
    useAIChatStore.setState({ ...initialAiChatState, isSessionLoading: false });

    render(<AIChatTabPanel diagramId="diagram-1" />);

    expect(screen.queryByText(/대화를 불러오는 중/)).not.toBeInTheDocument();
    expect(screen.getByText(/ERD에 대해 무엇이든 물어보세요/)).toBeInTheDocument();
  });
});

describe("AIChatTabPanel — 메시지 렌더링", () => {
  it("sessionMessages에 메시지가 있으면 MessageBubble이 렌더링된다", () => {
    useAIChatStore.setState({
      ...initialAiChatState,
      currentSessionId: DEFAULT_SESSION_ID,
      sessionMessages: {
        [DEFAULT_SESSION_ID]: [
          {
            id: "msg-1",
            role: "user",
            content: "테이블 추가해줘",
            diff: null,
            pendingDocument: null,
            accepted: null,
          },
        ],
      },
    });

    render(<AIChatTabPanel diagramId="diagram-1" />);

    expect(screen.getByTestId("message-bubble")).toBeInTheDocument();
    expect(screen.getByText("테이블 추가해줘")).toBeInTheDocument();
  });
});

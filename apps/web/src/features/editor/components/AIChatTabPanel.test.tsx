import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AiModelOption } from "@erdify/contracts";
import type { AiChatSlice } from "@/features/ai/store/aiChatSlice";
import { AIChatTabPanel } from "./AIChatTabPanel";
import { useAIChatStore } from "@/features/ai/store/useAIChatStore";
import { useAIModelSelection } from "@/features/ai/hooks/useAIModelSelection";
import { useAIChatCore } from "@/features/ai/hooks/useAIChatCore";

vi.mock("@/features/ai/components/ai-chat-shared.css", () => ({
  chatHeader: "", chatHeaderLeft: "", chatHeaderIcon: "", chatHeaderTitle: "", chatHeaderSub: "",
  modelBtnWrap: "", modelBtn: "", modelBtnDot: "", modelBtnName: "", modelBtnBadge: "", modelBtnChevron: "",
  modelDropdown: "", modelDropdownProvider: "", modelDropdownItem: "", modelDropdownItemActive: "",
  modelDropdownItemName: "", modelDropdownDivider: "",
  modelDropdownBadge: { blue: "", purple: "", green: "", gray: "" },
  modelDropdownBackdrop: "", modelDropdownCheck: "",
  chatMessages: "", chatEmpty: "", chatEmptyIcon: "", chatThinking: "", thinkingDots: "", thinkingDot: "",
  chatInputArea: "", chatTextarea: "", chatSendBtnBase: "", chatSendBtnDisabled: "", chatSendBtnEnabled: "",
}));

vi.mock("@/features/ai/components/MessageBubble", () => ({
  MessageBubble: () => <div data-testid="message-bubble" />,
}));

vi.mock("@/features/ai/components/AIDiffReviewPanel", () => ({
  AIDiffReviewPanel: () => <div data-testid="ai-diff-review-panel" />,
}));

vi.mock("@/features/ai/components/AIChatSessionSelector", () => ({
  AIChatSessionSelector: () => <div data-testid="ai-chat-session-selector" />,
}));

vi.mock("@/features/ai/store/useAIChatStore", () => ({
  useAIChatStore: vi.fn(),
}));

vi.mock("@/features/ai/hooks/useAIModelSelection", () => ({
  useAIModelSelection: vi.fn(),
}));

vi.mock("@/features/ai/hooks/useAIChatCore", () => ({
  useAIChatCore: vi.fn(),
}));

const mockUseAIChatStore = vi.mocked(useAIChatStore);
const mockUseAIModelSelection = vi.mocked(useAIModelSelection);
const mockUseAIChatCore = vi.mocked(useAIChatCore);

const makeStoreState = (overrides: Partial<AiChatSlice> = {}): AiChatSlice => ({
  isOpen: false,
  isLoading: false,
  reviewingMessageId: null,
  currentSessionId: null,
  sessions: [],
  sessionMessages: {},
  currentDiagramId: null,
  streamingStatus: null,
  sessionHasMore: {},
  sessionHistoryLoading: {},
  setStreamingStatus: vi.fn(),
  setSessionMessages: vi.fn(),
  prependSessionMessages: vi.fn(),
  setSessionHistoryLoading: vi.fn(),
  openChat: vi.fn(),
  closeChat: vi.fn(),
  addUserMessage: vi.fn(),
  addAssistantMessage: vi.fn(),
  acceptDiff: vi.fn(),
  rejectDiff: vi.fn(),
  setLoading: vi.fn(),
  openReview: vi.fn(),
  closeReview: vi.fn(),
  setCurrentSession: vi.fn(),
  setSessions: vi.fn(),
  addSession: vi.fn(),
  setCurrentDiagramId: vi.fn(),
  startStreamingMessage: vi.fn(),
  appendStreamingDelta: vi.fn(),
  finalizeStreamingMessage: vi.fn(),
  ...overrides,
});

const makeModelSelectionState = (overrides: Partial<{
  models: AiModelOption[];
  selectedModel: string;
  handleModelSelect: (value: string) => void;
}> = {}) => ({
  models: [] as AiModelOption[],
  selectedModel: "",
  handleModelSelect: vi.fn(),
  ...overrides,
});

const makeChatCoreState = (overrides: Partial<ReturnType<typeof useAIChatCore>> = {}): ReturnType<typeof useAIChatCore> => ({
  input: "",
  setInput: vi.fn(),
  bottomRef: { current: null },
  currentMessages: [],
  sendBtnDisabled: true,
  reviewingMessage: null,
  currentDocument: null,
  handleSendInput: vi.fn(),
  handleKeyDown: vi.fn(),
  handleAccept: vi.fn(),
  handleReject: vi.fn(),
  handleSelectSession: vi.fn(),
  handleNewSession: vi.fn(),
  handleLoadMore: vi.fn(),
  canLoadMore: false,
  isLoadingHistory: false,
  ...overrides,
});

const ANTHROPIC_MODEL: AiModelOption = { provider: "anthropic", value: "claude-1", label: "Claude 3.5 Sonnet (권장)" };
const OPENAI_MODEL: AiModelOption = { provider: "openai", value: "gpt-4", label: "GPT-4 (고성능)" };

describe("AIChatTabPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAIChatStore.mockReturnValue(makeStoreState());
    mockUseAIModelSelection.mockReturnValue(makeModelSelectionState());
    mockUseAIChatCore.mockReturnValue(makeChatCoreState());
  });

  it("모델이 있으면 파싱된 모델 이름으로 토글 버튼을 렌더링한다", () => {
    mockUseAIModelSelection.mockReturnValue(
      makeModelSelectionState({ models: [ANTHROPIC_MODEL], selectedModel: "claude-1" }),
    );

    render(<AIChatTabPanel diagramId="diagram-1" />);

    const toggleBtn = screen.getByRole("button", { name: /Claude 3\.5 Sonnet/ });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("모델 토글 버튼 클릭 시 aria-expanded가 false에서 true로 바뀌고 provider별 모델 버튼이 담긴 드롭다운이 열린다", () => {
    mockUseAIModelSelection.mockReturnValue(
      makeModelSelectionState({ models: [ANTHROPIC_MODEL, OPENAI_MODEL], selectedModel: "claude-1" }),
    );

    render(<AIChatTabPanel diagramId="diagram-1" />);

    const toggleBtn = screen.getByRole("button", { name: /Claude 3\.5 Sonnet/ });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /GPT-4/ })).toBeInTheDocument();
  });

  it("모델 옵션 버튼 클릭 시 handleModelSelect가 해당 value로 호출되고 드롭다운이 닫힌다", () => {
    const handleModelSelect = vi.fn();
    mockUseAIModelSelection.mockReturnValue(
      makeModelSelectionState({ models: [ANTHROPIC_MODEL, OPENAI_MODEL], selectedModel: "claude-1", handleModelSelect }),
    );

    render(<AIChatTabPanel diagramId="diagram-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Claude 3\.5 Sonnet/ }));
    expect(screen.getByText("OpenAI")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /GPT-4/ }));

    expect(handleModelSelect).toHaveBeenCalledTimes(1);
    expect(handleModelSelect).toHaveBeenCalledWith("gpt-4");
    expect(screen.queryByText("OpenAI")).not.toBeInTheDocument();
  });

  it("드롭다운이 열려있을 때 backdrop(role=presentation) 클릭 시 드롭다운이 닫힌다", () => {
    mockUseAIModelSelection.mockReturnValue(
      makeModelSelectionState({ models: [ANTHROPIC_MODEL], selectedModel: "claude-1" }),
    );

    const { container } = render(<AIChatTabPanel diagramId="diagram-1" />);

    const toggleBtn = screen.getByRole("button", { name: /Claude 3\.5 Sonnet/ });
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);

    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("models가 비어있으면 토글 버튼 대신 '모델 미설정'을 보여준다", () => {
    mockUseAIModelSelection.mockReturnValue(makeModelSelectionState({ models: [] }));

    const { container } = render(<AIChatTabPanel diagramId="diagram-1" />);

    expect(screen.getByText("모델 미설정")).toBeInTheDocument();
    expect(container.querySelector("[aria-expanded]")).toBeNull();
  });
});

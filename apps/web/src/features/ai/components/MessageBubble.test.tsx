import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageBubble } from "./MessageBubble";
import type { AiMessage } from "../store/aiChatSlice";
import type { DiffChange } from "@erdify/contracts";

vi.mock("./DiffCard", () => ({
  DiffCard: ({ messageId, onOpenReview }: { messageId: string; diff: DiffChange[]; accepted: boolean | null; onOpenReview: (id: string) => void }) => (
    <div data-testid="diff-card" data-message-id={messageId}>
      <button type="button" onClick={() => onOpenReview(messageId)}>검토하기</button>
    </div>
  ),
}));

const makeUserMessage = (overrides: Partial<AiMessage> = {}): AiMessage => ({
  id: "msg-1",
  role: "user",
  content: "사용자 메시지입니다",
  diff: null,
  pendingDocument: null,
  accepted: null,
  ...overrides,
});

const makeAssistantMessage = (overrides: Partial<AiMessage> = {}): AiMessage => ({
  id: "msg-2",
  role: "assistant",
  content: "AI 응답입니다",
  diff: null,
  pendingDocument: null,
  accepted: null,
  ...overrides,
});

const makeDiff = (): DiffChange[] => [
  { type: "addTable" as const, tableId: "tbl-1", tableName: "users" },
];

describe("MessageBubble", () => {
  let onOpenReview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onOpenReview = vi.fn();
  });

  it("role=user 일 때 메시지 내용을 렌더링한다", () => {
    const message = makeUserMessage({ content: "안녕하세요" });
    render(<MessageBubble message={message} onOpenReview={onOpenReview} />);

    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
  });

  it("role=assistant 일 때 메시지 내용을 렌더링한다", () => {
    const message = makeAssistantMessage({ content: "무엇을 도와드릴까요?" });
    render(<MessageBubble message={message} onOpenReview={onOpenReview} />);

    expect(screen.getByText("무엇을 도와드릴까요?")).toBeInTheDocument();
  });

  it("role=assistant 일 때 마크다운을 HTML로 렌더링한다", () => {
    const message = makeAssistantMessage({
      content: "**굵은** 텍스트와 `코드`\n\n- 항목 1\n- 항목 2",
    });
    const { container } = render(
      <MessageBubble message={message} onOpenReview={onOpenReview} />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("굵은");
    expect(container.querySelector("code")?.textContent).toBe("코드");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("role=user 일 때는 마크다운을 변환하지 않고 원문 그대로 둔다", () => {
    const message = makeUserMessage({ content: "**굵게** 안 됨" });
    const { container } = render(
      <MessageBubble message={message} onOpenReview={onOpenReview} />,
    );

    expect(container.querySelector("strong")).toBeNull();
    expect(screen.getByText("**굵게** 안 됨")).toBeInTheDocument();
  });

  it("diff=null 일 때 DiffCard를 렌더링하지 않는다", () => {
    const message = makeUserMessage({ diff: null });
    render(<MessageBubble message={message} onOpenReview={onOpenReview} />);

    expect(screen.queryByTestId("diff-card")).not.toBeInTheDocument();
  });

  it("diff가 있을 때 DiffCard를 렌더링한다", () => {
    const message = makeAssistantMessage({ diff: makeDiff() });
    render(<MessageBubble message={message} onOpenReview={onOpenReview} />);

    expect(screen.getByTestId("diff-card")).toBeInTheDocument();
  });

  it("DiffCard의 검토하기 버튼 클릭 시 onOpenReview가 messageId와 함께 호출된다", () => {
    const message = makeAssistantMessage({ id: "msg-review", diff: makeDiff() });
    render(<MessageBubble message={message} onOpenReview={onOpenReview} />);

    fireEvent.click(screen.getByRole("button", { name: "검토하기" }));

    expect(onOpenReview).toHaveBeenCalledTimes(1);
    expect(onOpenReview).toHaveBeenCalledWith("msg-review");
  });
});

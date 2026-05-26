import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIChatWindow } from "./AIChatWindow";
import type { AiMessage } from "../store/aiChatSlice";

vi.mock("./MessageBubble", () => ({
  MessageBubble: ({ message }: { message: AiMessage; onOpenReview: (id: string) => void }) => (
    <div data-testid="message-bubble" data-role={message.role}>{message.content}</div>
  ),
}));

const makeMessage = (overrides: Partial<AiMessage> = {}): AiMessage => ({
  id: "msg-1",
  role: "user",
  content: "테스트 메시지",
  diff: null,
  pendingDocument: null,
  accepted: null,
  ...overrides,
});

describe("AIChatWindow", () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSend: ReturnType<typeof vi.fn>;
  let onOpenReview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    onClose = vi.fn();
    onSend = vi.fn();
    onOpenReview = vi.fn();
  });

  it("messages=[] 일 때 빈 상태 안내 메시지를 표시한다", () => {
    render(
      <AIChatWindow
        messages={[]}
        isLoading={false}
        onClose={onClose}
        onSend={onSend}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getByText(/ERD에 대해 무엇이든 물어보세요/i)).toBeInTheDocument();
  });

  it("isLoading=true 일 때 'AI가 생각 중...' 텍스트를 표시한다", () => {
    render(
      <AIChatWindow
        messages={[]}
        isLoading={true}
        onClose={onClose}
        onSend={onSend}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getByText("AI가 생각 중...")).toBeInTheDocument();
  });

  it("isLoading=true 일 때 전송 버튼이 disabled 상태이다", () => {
    render(
      <AIChatWindow
        messages={[]}
        isLoading={true}
        onClose={onClose}
        onSend={onSend}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getByRole("button", { name: "전송" })).toBeDisabled();
  });

  it("입력 후 전송 버튼 클릭 시 onSend가 호출되고 input이 초기화된다", () => {
    render(
      <AIChatWindow
        messages={[]}
        isLoading={false}
        onClose={onClose}
        onSend={onSend}
        onOpenReview={onOpenReview}
      />
    );

    const textarea = screen.getByPlaceholderText(/메시지 입력/i);
    fireEvent.change(textarea, { target: { value: "안녕하세요" } });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("안녕하세요");
    expect(textarea).toHaveValue("");
  });

  it("Enter 키 입력 시 onSend가 호출된다", () => {
    render(
      <AIChatWindow
        messages={[]}
        isLoading={false}
        onClose={onClose}
        onSend={onSend}
        onOpenReview={onOpenReview}
      />
    );

    const textarea = screen.getByPlaceholderText(/메시지 입력/i);
    fireEvent.change(textarea, { target: { value: "Enter 전송 테스트" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("Enter 전송 테스트");
  });

  it("Shift+Enter 키 입력 시 onSend가 호출되지 않는다", () => {
    render(
      <AIChatWindow
        messages={[]}
        isLoading={false}
        onClose={onClose}
        onSend={onSend}
        onOpenReview={onOpenReview}
      />
    );

    const textarea = screen.getByPlaceholderText(/메시지 입력/i);
    fireEvent.change(textarea, { target: { value: "줄바꿈 테스트" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("빈 입력으로 전송 시 onSend가 호출되지 않는다", () => {
    render(
      <AIChatWindow
        messages={[]}
        isLoading={false}
        onClose={onClose}
        onSend={onSend}
        onOpenReview={onOpenReview}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("메시지 목록이 있을 때 MessageBubble을 렌더링한다", () => {
    const messages = [
      makeMessage({ id: "m1", role: "user", content: "질문입니다" }),
      makeMessage({ id: "m2", role: "assistant", content: "답변입니다" }),
    ];

    render(
      <AIChatWindow
        messages={messages}
        isLoading={false}
        onClose={onClose}
        onSend={onSend}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getAllByTestId("message-bubble")).toHaveLength(2);
    expect(screen.getByText("질문입니다")).toBeInTheDocument();
    expect(screen.getByText("답변입니다")).toBeInTheDocument();
  });
});

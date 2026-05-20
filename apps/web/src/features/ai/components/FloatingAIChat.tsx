import { randomUUID } from "@/shared/utils/uuid";
import { useRef, useEffect, useState } from "react";
import { useAIChatStore } from "../store/useAIChatStore";
import { MessageBubble } from "./MessageBubble";
import { sendAiChat, acceptAiDiff, rejectAiDiff } from "../api/ai.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import "./FloatingAIChat.css";

interface FloatingAIChatProps {
  diagramId: string;
}

export const FloatingAIChat = ({ diagramId }: FloatingAIChatProps) => {
  const { isOpen, messages, isLoading, openChat, closeChat, addUserMessage, addAssistantMessage, acceptDiff, rejectDiff, setLoading } = useAIChatStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (message: string) => {
    addUserMessage(message);
    setLoading(true);
    try {
      const response = await sendAiChat(diagramId, message);
      addAssistantMessage(response);
    } catch {
      addAssistantMessage({ messageId: randomUUID(), content: "오류가 발생했습니다. 다시 시도해주세요.", diff: null, pendingDocument: null });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInput = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    handleSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendInput();
    }
  };

  const handleAccept = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.pendingDocument) return;
    acceptDiff(messageId);
    await acceptAiDiff(messageId).catch(() => {});
    useEditorStore.getState().setDocument(msg.pendingDocument);
  };

  const handleReject = async (messageId: string) => {
    rejectDiff(messageId);
    await rejectAiDiff(messageId).catch(() => {});
  };

  return (
    <div className={`ai-float ${isOpen ? "ai-float--open" : "ai-float--closed"}`} onClick={!isOpen ? () => openChat() : undefined}>

      {/* FAB icon (보임: closed, 숨김: open) */}
      <div className="ai-fab-content">
        <div className="ai-fab-icon">✦</div>
        <div className="ai-fab-label">AI</div>
      </div>

      {/* 채팅 창 (보임: open, 숨김: closed) */}
      <div className="ai-chat-content">
        {/* 헤더 */}
        <div className="ai-chat-header">
          <div className="ai-chat-header-left">
            <div className="ai-chat-header-icon">✦</div>
            <div>
              <div className="ai-chat-header-title">ERDify AI</div>
              <div className="ai-chat-header-sub">Claude · GPT-4o</div>
            </div>
          </div>
          <button type="button" className="ai-chat-close" onClick={closeChat}>×</button>
        </div>

        {/* 메시지 목록 */}
        <div className="ai-chat-messages">
          {messages.length === 0 && (
            <div className="ai-chat-empty">
              <div className="ai-chat-empty-icon">✦</div>
              ERD에 대해 무엇이든 물어보세요.<br />
              <span style={{ fontSize: 12 }}>"orders 테이블 추가해줘" 같은 명령도 가능해요.</span>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onAccept={handleAccept} onReject={handleReject} />
          ))}
          {isLoading && (
            <div className="ai-chat-thinking">
              <div className="ai-chat-thinking-dots">
                <span /><span /><span />
              </div>
              AI가 생각 중...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="ai-chat-input-area">
          <textarea
            className="ai-chat-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력 (Enter 전송)"
            rows={2}
          />
          <button
            type="button"
            className="ai-chat-send"
            onClick={handleSendInput}
            disabled={isLoading || !input.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};

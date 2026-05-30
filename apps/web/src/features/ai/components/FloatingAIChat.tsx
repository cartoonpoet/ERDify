import { useRef, useEffect, useState } from "react";
import { useAIChatStore } from "../store/useAIChatStore";
import { MessageBubble } from "./MessageBubble";
import { AIDiffReviewPanel } from "./AIDiffReviewPanel";
import { streamAiChat, acceptAiDiff, rejectAiDiff, getAiChatHistory } from "../api/ai.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import * as s from "./FloatingAIChat.css";

interface FloatingAIChatProps {
  diagramId: string;
}

export const FloatingAIChat = ({ diagramId }: FloatingAIChatProps) => {
  const {
    isOpen, messages, isLoading, streamingStatus, streamingText,
    reviewingMessageId, openReview, closeReview,
    openChat, closeChat,
    addUserMessage, acceptDiff, rejectDiff,
    startAssistantStream, appendStreamText, setStreamStatus, finishAssistantStream, failAssistantStream,
    resetForDiagram, loadHistory,
  } = useAIChatStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 다이어그램이 바뀌면 채팅을 초기화하고 저장된 대화를 복원한다 (다이어그램별 분리).
  // 스토어의 현재 diagramId는 getState로 읽어 의존성에서 제외 → reset이 일으키는
  // 재실행으로 진행 중인 history fetch가 취소되는 것을 방지.
  useEffect(() => {
    if (useAIChatStore.getState().diagramId === diagramId) return;
    resetForDiagram(diagramId);
    let cancelled = false;
    getAiChatHistory(diagramId)
      .then((rows) => { if (!cancelled) loadHistory(diagramId, rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [diagramId, resetForDiagram, loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, streamingStatus]);

  const handleSend = async (message: string) => {
    addUserMessage(message);
    startAssistantStream();
    try {
      await streamAiChat(diagramId, message, (event) => {
        if (event.type === "step") appendStreamText(event.text);
        else if (event.type === "tool_call") setStreamStatus(event.label);
        else if (event.type === "done") finishAssistantStream(event);
        else if (event.type === "error") failAssistantStream(event.message);
      });
    } catch {
      failAssistantStream("오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleSendInput = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    handleSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendInput();
    }
  };

  const handleAccept = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.pendingDocument) return;
    acceptDiff(messageId);
    closeReview();
    await acceptAiDiff(messageId).catch(() => {});
    useEditorStore.getState().setDocument(msg.pendingDocument);
  };

  const handleReject = async (messageId: string) => {
    rejectDiff(messageId);
    closeReview();
    await rejectAiDiff(messageId).catch(() => {});
  };

  const sendBtnDisabled = isLoading || !input.trim();

  const reviewingMessage = reviewingMessageId
    ? messages.find((m) => m.id === reviewingMessageId)
    : null;

  const currentDocument = useEditorStore.getState().document;

  return (
    <>
      {reviewingMessage?.diff && reviewingMessage.pendingDocument && (
        <AIDiffReviewPanel
          diff={reviewingMessage.diff}
          pendingDocument={reviewingMessage.pendingDocument}
          currentDocument={currentDocument}
          onAccept={() => handleAccept(reviewingMessage.id)}
          onReject={() => handleReject(reviewingMessage.id)}
        />
      )}

      <div
        className={isOpen ? s.floatContainerOpen : s.floatContainerClosed}
        onClick={!isOpen ? () => openChat() : undefined}
      >
        <div className={isOpen ? s.fabContentOpen : s.fabContentClosed}>
          <div className={s.fabIcon}>✦</div>
          <div className={s.fabLabel}>AI</div>
        </div>

        <div className={isOpen ? s.chatContentOpen : s.chatContentClosed}>
          <div className={s.chatHeader}>
            <div className={s.chatHeaderLeft}>
              <div className={s.chatHeaderIcon}>✦</div>
              <div>
                <div className={s.chatHeaderTitle}>ERDify AI</div>
                <div className={s.chatHeaderSub}>Claude · GPT · Gemini</div>
              </div>
            </div>
            <button type="button" className={s.chatCloseBtn} onClick={closeChat}>×</button>
          </div>

          <div className={s.chatMessages}>
            {messages.length === 0 && (
              <div className={s.chatEmpty}>
                <div className={s.chatEmptyIcon}>✦</div>
                ERD에 대해 무엇이든 물어보세요.<br />
                <span style={{ fontSize: 12 }}>"orders 테이블 추가해줘" 같은 명령도 가능해요.</span>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onOpenReview={openReview} />
            ))}
            {isLoading && (
              <div className={s.chatThinking}>
                <div className={s.thinkingDots}>
                  <div className={s.thinkingDot} />
                  <div className={s.thinkingDot} />
                  <div className={s.thinkingDot} />
                </div>
                {streamingStatus ?? "AI가 생각 중..."}
                {streamingText && <div className={s.streamingText}>{streamingText}</div>}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={s.chatInputArea}>
            <div className={s.chatInputRow}>
              <textarea
                className={s.chatTextarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지 입력 (Enter 전송)"
                rows={2}
              />
              <button
                type="button"
                className={`${s.chatSendBtnBase} ${sendBtnDisabled ? s.chatSendBtnDisabled : s.chatSendBtnEnabled}`}
                onClick={handleSendInput}
                disabled={sendBtnDisabled}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

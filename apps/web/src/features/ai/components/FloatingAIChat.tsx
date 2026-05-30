import { useRef, useEffect, useState } from "react";
import { useAIChatStore } from "../store/useAIChatStore";
import { MessageBubble } from "./MessageBubble";
import { AIDiffReviewPanel } from "./AIDiffReviewPanel";
import { streamAiChat, acceptAiDiff, rejectAiDiff, getAiChatHistory, getAiChatConfig } from "../api/ai.api";
import { PROVIDER_LABELS, AI_PROVIDERS, type AiModelOption } from "../models";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import * as s from "./FloatingAIChat.css";

interface FloatingAIChatProps {
  diagramId: string;
}

const MODEL_STORAGE_KEY = "erdify.ai.model";

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
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 다이어그램의 조직에 등록된 provider × 허용 모델을 불러와 드롭다운을 채운다.
  // 선택은 localStorage에 기억하되, 더 이상 허용되지 않으면 첫 모델로 폴백.
  useEffect(() => {
    let cancelled = false;
    getAiChatConfig(diagramId)
      .then((config) => {
        if (cancelled) return;
        setModels(config.models);
        const saved = localStorage.getItem(MODEL_STORAGE_KEY) ?? "";
        const valid = config.models.some((m) => m.value === saved);
        setSelectedModel(valid ? saved : (config.models[0]?.value ?? ""));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [diagramId]);

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    localStorage.setItem(MODEL_STORAGE_KEY, value);
  };

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
      await streamAiChat(diagramId, message, selectedModel, (event) => {
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
                {models.length > 0 ? (
                  <select
                    className={s.modelSelect}
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    title="모델 선택"
                  >
                    {AI_PROVIDERS.filter((p) => models.some((m) => m.provider === p)).map((p) => (
                      <optgroup key={p} label={PROVIDER_LABELS[p]}>
                        {models.filter((m) => m.provider === p).map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <div className={s.chatHeaderSub}>모델 미설정</div>
                )}
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

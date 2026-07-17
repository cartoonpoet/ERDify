import React, { useState, useRef } from "react";
import { useAIChatStore } from "../store/useAIChatStore";
import { MessageBubble } from "./MessageBubble";
import { AIDiffReviewPanel } from "./AIDiffReviewPanel";
import { AIChatSessionSelector } from "./AIChatSessionSelector";
import { PROVIDER_LABELS, AI_PROVIDERS } from "../models";
import { useAIModelSelection } from "../hooks/useAIModelSelection";
import { useAIChatCore } from "../hooks/useAIChatCore";
import { parseModelLabel, getBadgeVariant } from "../ai-chat-utils";
import * as s from "./FloatingAIChat.css";

interface FloatingAIChatProps {
  diagramId: string;
}

export const FloatingAIChat = ({ diagramId }: FloatingAIChatProps) => {
  const {
    isOpen, isLoading,
    openReview,
    openChat, closeChat,
    currentSessionId, sessions, streamingStatus,
  } = useAIChatStore();

  const [isModelOpen, setIsModelOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { models, selectedModel, handleModelSelect } =
    useAIModelSelection(diagramId);

  const {
    input, setInput, bottomRef, currentMessages, sendBtnDisabled,
    reviewingMessage, currentDocument,
    handleSendInput, handleKeyDown, handleAccept, handleReject,
    handleSelectSession, handleNewSession,
    handleLoadMore, canLoadMore, isLoadingHistory,
  } = useAIChatCore(diagramId, selectedModel);

  const handleModelToggle = () => setIsModelOpen((v) => !v);
  const handleModelBackdropClick = () => setIsModelOpen(false);
  const handleSelectModel = (value: string) => () => { handleModelSelect(value); setIsModelOpen(false); };

  const handleFabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openChat();
    }
  };

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && canLoadMore && !isLoadingHistory) {
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;
      handleLoadMore().then(() => {
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        });
      });
    }
  };

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

      {/* 닫힘 상태에서는 컨테이너 전체가 채팅 열기 버튼 역할을 한다. */}
      <div
        className={isOpen ? s.floatContainerOpen : s.floatContainerClosed}
        role={isOpen ? undefined : "button"}
        tabIndex={isOpen ? undefined : 0}
        aria-label={isOpen ? undefined : "AI 채팅 열기"}
        onClick={!isOpen ? () => openChat() : undefined}
        onKeyDown={isOpen ? undefined : handleFabKeyDown}
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
                  <>
                    {isModelOpen && (
                      // 배경 클릭 dismiss 전용 오버레이 — 키보드 사용자는 모델 버튼으로 토글한다.
                      <div
                        className={s.modelDropdownBackdrop}
                        role="presentation"
                        onClick={handleModelBackdropClick}
                      />
                    )}
                    {/* 토글 버튼과 드롭다운을 형제로 담는 포지셔닝 래퍼 — 인터랙티브 요소 중첩을 피한다. */}
                    <div className={s.modelBtnWrap}>
                      <button
                        type="button"
                        className={s.modelBtn}
                        aria-expanded={isModelOpen}
                        onClick={handleModelToggle}
                      >
                        <span className={s.modelBtnDot} />
                        <span className={s.modelBtnName}>
                          {parseModelLabel(models.find((m) => m.value === selectedModel)?.label ?? "").name}
                        </span>
                        {(() => {
                          const badge = parseModelLabel(models.find((m) => m.value === selectedModel)?.label ?? "").badge;
                          return badge ? <span className={s.modelBtnBadge}>{badge}</span> : null;
                        })()}
                        <span className={s.modelBtnChevron}>{isModelOpen ? "▴" : "▾"}</span>
                      </button>
                      {isModelOpen && (
                        <div className={s.modelDropdown}>
                          {AI_PROVIDERS.filter((p) => models.some((m) => m.provider === p)).map((p, i) => (
                            <React.Fragment key={p}>
                              {i > 0 && <hr className={s.modelDropdownDivider} />}
                              <div className={s.modelDropdownProvider}>{PROVIDER_LABELS[p]}</div>
                              {models.filter((m) => m.provider === p).map((m) => {
                                const { name, badge } = parseModelLabel(m.label);
                                const isActive = m.value === selectedModel;
                                return (
                                  <button
                                    type="button"
                                    key={m.value}
                                    className={[s.modelDropdownItem, isActive ? s.modelDropdownItemActive : ""].filter(Boolean).join(" ")}
                                    onClick={handleSelectModel(m.value)}
                                  >
                                    <span className={s.modelDropdownItemName}>{name}</span>
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      {badge && <span className={s.modelDropdownBadge[getBadgeVariant(badge)]}>{badge}</span>}
                                      {isActive && <span className={s.modelDropdownCheck}>✓</span>}
                                    </span>
                                  </button>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={s.chatHeaderSub}>모델 미설정</div>
                )}
              </div>
            </div>
            <button type="button" className={s.chatCloseBtn} onClick={closeChat}>×</button>
          </div>

          <AIChatSessionSelector
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
          />

          <div className={s.chatMessages} ref={messagesContainerRef} onScroll={handleMessagesScroll}>
            {isLoadingHistory && (
              <div className={s.chatThinking} style={{ justifyContent: "center" }}>
                <div className={s.thinkingDots}>
                  <div className={s.thinkingDot} />
                  <div className={s.thinkingDot} />
                  <div className={s.thinkingDot} />
                </div>
              </div>
            )}
            {currentMessages.length === 0 && !isLoadingHistory && (
              <div className={s.chatEmpty}>
                <div className={s.chatEmptyIcon}>✦</div>
                ERD에 대해 무엇이든 물어보세요.<br />
                <span style={{ fontSize: 12 }}>"orders 테이블 추가해줘" 같은 명령도 가능해요.</span>
              </div>
            )}
            {currentMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onOpenReview={openReview} />
            ))}
            {streamingStatus && (
              <div className={s.chatThinking}>
                <span>🔧</span> {streamingStatus}
              </div>
            )}
            {isLoading && (
              <div className={s.chatThinking}>
                <div className={s.thinkingDots}>
                  <div className={s.thinkingDot} />
                  <div className={s.thinkingDot} />
                  <div className={s.thinkingDot} />
                </div>
                AI가 생각 중...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={s.chatInputArea}>
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
    </>
  );
};

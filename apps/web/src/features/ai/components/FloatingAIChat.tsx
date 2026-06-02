import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  const { orgId } = useParams<{ orgId: string }>();
  const {
    isOpen, isLoading,
    openReview,
    openChat, closeChat,
    currentSessionId, sessions, streamingStatus,
  } = useAIChatStore();

  const [isModelOpen, setIsModelOpen] = useState(false);
  const { models, selectedModel, handleModelSelect } =
    useAIModelSelection(diagramId);

  const {
    input, setInput, bottomRef, currentMessages, sendBtnDisabled,
    reviewingMessage, currentDocument,
    handleSendInput, handleKeyDown, handleAccept, handleReject,
    handleSelectSession, handleNewSession, isSessionLoading,
  } = useAIChatCore(diagramId, selectedModel);

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
                  <>
                    {isModelOpen && (
                      <div
                        className={s.modelDropdownBackdrop}
                        onClick={(e) => { e.stopPropagation(); setIsModelOpen(false); }}
                      />
                    )}
                    <div
                      className={s.modelBtn}
                      onClick={(e) => { e.stopPropagation(); setIsModelOpen((v) => !v); }}
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
                      {isModelOpen && (
                        <div className={s.modelDropdown} onClick={(e) => e.stopPropagation()}>
                          {AI_PROVIDERS.filter((p) => models.some((m) => m.provider === p)).map((p, i) => (
                            <React.Fragment key={p}>
                              {i > 0 && <hr className={s.modelDropdownDivider} />}
                              <div className={s.modelDropdownProvider}>{PROVIDER_LABELS[p]}</div>
                              {models.filter((m) => m.provider === p).map((m) => {
                                const { name, badge } = parseModelLabel(m.label);
                                const isActive = m.value === selectedModel;
                                return (
                                  <div
                                    key={m.value}
                                    className={[s.modelDropdownItem, isActive ? s.modelDropdownItemActive : ""].filter(Boolean).join(" ")}
                                    onClick={() => { handleModelSelect(m.value); setIsModelOpen(false); }}
                                  >
                                    <span className={s.modelDropdownItemName}>{name}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      {badge && <span className={s.modelDropdownBadge[getBadgeVariant(badge)]}>{badge}</span>}
                                      {isActive && <span className={s.modelDropdownCheck}>✓</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <Link to={`/${orgId}/settings`} className={s.chatHeaderSub} style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline", cursor: "pointer" }}>
                    AI 설정하기 →
                  </Link>
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

          <div className={s.chatMessages}>
            {isSessionLoading ? (
              <div className={s.chatThinking}>
                <div className={s.thinkingDots}>
                  <div className={s.thinkingDot} />
                  <div className={s.thinkingDot} />
                  <div className={s.thinkingDot} />
                </div>
                대화를 불러오는 중...
              </div>
            ) : (
              <>
                {currentMessages.length === 0 && (
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
              </>
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

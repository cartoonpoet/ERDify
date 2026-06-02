import React, { useState } from "react";
import { useAIChatStore } from "@/features/ai/store/useAIChatStore";
import { MessageBubble } from "@/features/ai/components/MessageBubble";
import { AIDiffReviewPanel } from "@/features/ai/components/AIDiffReviewPanel";
import { AIChatSessionSelector } from "@/features/ai/components/AIChatSessionSelector";
import { PROVIDER_LABELS, AI_PROVIDERS } from "@/features/ai/models";
import { useAIModelSelection } from "@/features/ai/hooks/useAIModelSelection";
import { useAIChatCore } from "@/features/ai/hooks/useAIChatCore";
import { parseModelLabel, getBadgeVariant } from "@/features/ai/ai-chat-utils";
import * as s from "@/features/ai/components/ai-chat-shared.css";

interface AIChatTabPanelProps {
  diagramId: string;
}

export const AIChatTabPanel = ({ diagramId }: AIChatTabPanelProps) => {
  const {
    isLoading,
    openReview,
    currentSessionId, sessions, streamingStatus,
  } = useAIChatStore();

  const [isModelOpen, setIsModelOpen] = useState(false);
  const { models, selectedModel, handleModelSelect } =
    useAIModelSelection(diagramId);

  const {
    input, setInput, bottomRef, currentMessages, sendBtnDisabled,
    reviewingMessage, currentDocument,
    handleSendInput, handleKeyDown, handleAccept, handleReject,
    handleSelectSession, handleNewSession,
  } = useAIChatCore(diagramId, selectedModel);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {reviewingMessage?.diff && reviewingMessage.pendingDocument && (
        <AIDiffReviewPanel
          diff={reviewingMessage.diff}
          pendingDocument={reviewingMessage.pendingDocument}
          currentDocument={currentDocument}
          onAccept={() => handleAccept(reviewingMessage.id)}
          onReject={() => handleReject(reviewingMessage.id)}
        />
      )}

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
              <div className={s.chatHeaderSub}>모델 미설정</div>
            )}
          </div>
        </div>
      </div>

      <AIChatSessionSelector
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />

      <div className={s.chatMessages}>
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
  );
};

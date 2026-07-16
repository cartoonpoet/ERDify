import { useState } from "react";
import type { AiSession } from "../store/aiChatSlice";
import * as css from "./AIChatSessionSelector.css";

interface AIChatSessionSelectorProps {
  sessions: AiSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export const AIChatSessionSelector = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
}: AIChatSessionSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const currentLabel = currentSession ? currentSession.name : "새 대화";

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleSelect = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsOpen(false);
  };

  const handleNewSession = () => {
    onNewSession();
    setIsOpen(false);
  };

  const handleBackdropClick = () => setIsOpen(false);

  const arrowClass = isOpen ? `${css.dropdownArrow} ${css.dropdownArrowOpen}` : css.dropdownArrow;

  return (
    <div className={css.container}>
      {isOpen && (
        // 배경 클릭 dismiss 전용 오버레이 — 키보드 사용자는 드롭다운 토글 버튼을 사용한다.
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          role="presentation"
          onClick={handleBackdropClick}
        />
      )}

      <button type="button" className={css.dropdownBtn} onClick={handleToggle}>
        <span className={css.dropdownBtnLabel}>{currentLabel}</span>
        <span className={arrowClass}>▾</span>
      </button>

      <button type="button" className={css.newSessionBtn} onClick={handleNewSession}>
        + 새 세션
      </button>

      {isOpen && (
        <div className={css.dropdownList}>
          {sessions.length === 0 ? (
            <div className={css.dropdownEmpty}>이전 세션이 없습니다</div>
          ) : (
            sessions.map((session) => (
              <button
                type="button"
                key={session.id}
                className={
                  session.id === currentSessionId
                    ? `${css.dropdownItem} ${css.dropdownItemActive}`
                    : css.dropdownItem
                }
                onClick={() => handleSelect(session.id)}
              >
                <span className={css.dropdownItemName}>{session.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

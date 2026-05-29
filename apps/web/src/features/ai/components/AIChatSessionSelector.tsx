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

  return (
    <div className={css.container}>
      {isOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={handleBackdropClick}
        />
      )}

      <button type="button" className={css.dropdownBtn} onClick={handleToggle}>
        <span className={css.dropdownBtnLabel}>{currentLabel}</span>
        <span className={`${css.dropdownArrow}${isOpen ? ` ${css.dropdownArrowOpen}` : ""}`}>▾</span>
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
              <div
                key={session.id}
                className={`${css.dropdownItem}${session.id === currentSessionId ? ` ${css.dropdownItemActive}` : ""}`}
                onClick={() => handleSelect(session.id)}
              >
                <span className={css.dropdownItemName}>{session.name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

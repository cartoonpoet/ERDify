import { useState } from "react";
import { createPortal } from "react-dom";
import type { AnnouncementResponse } from "@erdify/contracts";
import { AnnouncementSlide } from "./AnnouncementSlide";
import * as css from "./AnnouncementModal.css";

interface AnnouncementModalProps {
  unread: AnnouncementResponse[];
  onMarkSeen: (id: string) => void;
  onMarkAllSeen: () => void;
}

export const AnnouncementModal = ({ unread, onMarkSeen, onMarkAllSeen }: AnnouncementModalProps) => {
  const [index, setIndex] = useState(0);

  if (unread.length === 0) return null;

  const current = unread[index]!;
  const isLast = index === unread.length - 1;
  const isMultiple = unread.length > 1;

  const handleNoShow = () => {
    onMarkSeen(current.id);
    if (!isLast) setIndex((i) => i + 1);
    else onMarkAllSeen();
  };

  const handleConfirm = () => {
    if (isLast) {
      onMarkAllSeen();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return createPortal(
    <div className={css.backdrop}>
      <div className={css.panel} role="dialog" aria-modal aria-label="공지사항">
        <div className={css.header}>
          <span className={css.headerTitle}>공지사항</span>
          {isMultiple && (
            <span className={css.counter}>{index + 1} / {unread.length}</span>
          )}
          <button
            className={css.closeBtn}
            onClick={onMarkAllSeen}
            disabled={current.isUrgent}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {isMultiple && (
          <div className={css.dots} data-testid="pagination-dots">
            {unread.map((_, i) => (
              <div key={i} className={`${css.dot} ${i === index ? css.dotActive : ""}`} />
            ))}
          </div>
        )}

        <AnnouncementSlide announcement={current} />

        <div className={css.divider} />

        <div className={css.navRow}>
          {isMultiple && (
            <>
              <button className={css.navBtn} onClick={() => setIndex((i) => i - 1)} disabled={index === 0} aria-label="이전">‹</button>
              <button className={css.navBtn} onClick={() => setIndex((i) => i + 1)} disabled={isLast} aria-label="다음">›</button>
            </>
          )}
          {!current.isUrgent && (
            <button className={css.noShow} onClick={handleNoShow}>다시 보지 않기</button>
          )}
          <div className={css.spacer} />
          <button className={css.confirmBtn} onClick={handleConfirm}>
            {isLast ? "확인" : "다음 →"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

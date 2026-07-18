import type { PropsWithChildren, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { backdrop, panel, header, title as titleStyle, closeBtn } from "./modal.css";

interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
}

export const Modal = ({ open, onClose, title, maxWidth = "440px", children }: ModalProps) => {
  if (!open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key === "Escape") onClose();
  }

  return createPortal(
    <div
      className={backdrop}
      data-testid="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* open 속성만으로는 <dialog>가 비모달로 동작해 aria-modal이 암묵적으로 붙지 않는다(showModal() 미사용) —
          기존 div+role="dialog" 구조에 있던 aria-modal 신호를 명시적으로 되살린다. */}
      <dialog
        open
        className={panel}
        aria-label={title}
        aria-modal="true"
        tabIndex={-1}
        autoFocus
        onKeyDown={onKeyDown}
        style={{ maxWidth }}
      >
        <div className={header}>
          <span className={titleStyle}>{title}</span>
          <button className={closeBtn} onClick={onClose} aria-label="닫기">×</button>
        </div>
        {children}
      </dialog>
    </div>,
    document.body
  );
};

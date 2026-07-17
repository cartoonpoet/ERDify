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
      <dialog
        open
        className={panel}
        aria-label={title}
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

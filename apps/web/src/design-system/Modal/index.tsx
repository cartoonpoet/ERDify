import { type PropsWithChildren, useEffect } from "react";
import { createPortal } from "react-dom";
import { backdrop, panel, header, title as titleStyle, closeBtn } from "./modal.css";

interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title: string;
}

export const Modal = ({ open, onClose, title, children }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={backdrop}
      data-testid="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={panel} role="dialog" aria-modal aria-label={title}>
        <div className={header}>
          <span className={titleStyle}>{title}</span>
          <button className={closeBtn} onClick={onClose} aria-label="닫기">×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

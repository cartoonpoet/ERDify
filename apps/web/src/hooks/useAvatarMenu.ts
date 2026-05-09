import { useState } from "react";
import type { FocusEvent } from "react";

export const useAvatarMenu = () => {
  const [open, setOpen] = useState(false);

  return {
    menuOpen: open,
    toggleMenu: () => setOpen((v) => !v),
    closeMenu: () => setOpen(false),
    handleBlur: (e: FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
    },
  };
};

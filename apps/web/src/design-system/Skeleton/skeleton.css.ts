import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "../tokens.css";

const pulse = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.4 },
});

export const skeleton = style({
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.md,
  animation: `${pulse} 1.5s ease-in-out infinite`,
});

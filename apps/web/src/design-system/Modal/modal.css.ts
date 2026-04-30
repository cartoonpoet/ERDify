import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "../tokens.css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const slideUp = keyframes({
  from: { opacity: 0, transform: "translateY(16px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

export const backdrop = style({
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  animation: `${fadeIn} 150ms ease`,
});

export const panel = style({
  background: vars.color.surface,
  borderRadius: vars.radius.xl,
  boxShadow: vars.shadow.xl,
  width: "100%",
  maxWidth: "440px",
  padding: vars.space["6"],
  animation: `${slideUp} 200ms ease`,
});

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: vars.space["5"],
});

export const title = style({
  fontSize: "16px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  letterSpacing: "-0.3px",
});

export const closeBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textSecondary,
  fontSize: "20px",
  lineHeight: 1,
  padding: "2px",
  borderRadius: vars.radius.sm,
  selectors: {
    "&:hover": { color: vars.color.textPrimary, background: vars.color.surfaceSecondary },
  },
});

import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const popover = style({
  position: "absolute",
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: "10px 12px",
  boxShadow: vars.shadow.lg,
  width: 186,
  zIndex: 1000,
  fontSize: 11,
});

export const arrow = style({
  position: "absolute",
  top: -5,
  left: "50%",
  width: 8,
  height: 8,
  background: vars.color.surface,
  borderLeft: `1px solid ${vars.color.border}`,
  borderTop: `1px solid ${vars.color.border}`,
  transform: "translateX(-50%) rotate(45deg)",
});

export const sectionLabel = style({
  fontSize: 10,
  fontWeight: 600,
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: vars.space["1"],
});

export const section = style({
  marginBottom: vars.space["2"],
});

export const toggleRow = style({
  display: "flex",
  gap: vars.space["1"],
});

export const toggleBtn = style({
  flex: 1,
  fontSize: 11,
  padding: `4px 0`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
  fontFamily: vars.font.family,
  transition: "all 120ms ease",
});

export const toggleBtnActive = style({
  background: vars.color.primary,
  color: "#ffffff",
  borderColor: vars.color.primary,
});

export const select = style({
  width: "100%",
  fontSize: 11,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 3,
  padding: `3px ${vars.space["1"]}`,
  color: vars.color.textSecondary,
  background: vars.color.surfaceTertiary,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary },
  },
});

export const deleteBtn = style({
  width: "100%",
  padding: `5px 0`,
  background: "none",
  border: `1px solid ${vars.color.error}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  color: vars.color.error,
  fontSize: 11,
  fontFamily: vars.font.family,
  marginTop: vars.space["1"],
  transition: "background 120ms ease",
  selectors: {
    "&:hover": { background: `${vars.color.error}14` },
  },
});

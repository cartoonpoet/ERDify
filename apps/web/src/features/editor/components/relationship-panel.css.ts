import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const panel = style({
  width: "280px",
  height: "100%",
  background: vars.color.surface,
  borderLeft: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  fontSize: "13px",
  overflow: "hidden",
});

export const panelHeader = style({
  padding: `${vars.space["3"]} 14px`,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
});

export const panelTitle = style({
  fontWeight: "700",
  fontSize: "14px",
  color: vars.color.textPrimary,
  flex: 1,
});

export const closeBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textDisabled,
  fontSize: "16px",
  lineHeight: 1,
  padding: `2px ${vars.space["1"]}`,
  borderRadius: vars.radius.sm,
  selectors: {
    "&:hover": { color: vars.color.textPrimary },
  },
});

export const section = style({
  padding: `10px 14px`,
  borderBottom: `1px solid ${vars.color.surfaceTertiary}`,
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const label = style({
  fontSize: "11px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const toggleRow = style({
  display: "flex",
  gap: vars.space["2"],
});

export const toggleBtn = style({
  flex: 1,
  padding: `6px 0`,
  fontSize: "12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
  fontFamily: vars.font.family,
  transition: "all 150ms ease",
});

export const toggleBtnActive = style({
  background: vars.color.primary,
  color: "#ffffff",
  borderColor: vars.color.primary,
});

export const select = style({
  fontSize: "12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "3px",
  padding: `4px ${vars.space["1"]}`,
  color: vars.color.textSecondary,
  background: vars.color.surfaceTertiary,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary },
  },
});

export const deleteBtn = style({
  margin: "10px 14px",
  padding: `6px 0`,
  background: "none",
  border: `1px solid ${vars.color.error}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  color: vars.color.error,
  fontSize: "13px",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
  selectors: {
    "&:hover": { background: `${vars.color.error}14` },
  },
});

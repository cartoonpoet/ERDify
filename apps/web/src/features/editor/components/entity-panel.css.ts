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

export const nameInput = style({
  flex: 1,
  fontWeight: "700",
  fontSize: "14px",
  border: "1px solid transparent",
  borderRadius: vars.radius.sm,
  padding: `2px ${vars.space["1"]}`,
  outline: "none",
  background: "transparent",
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 2px ${vars.color.focusRing}`,
    },
  },
});

export const deleteEntityBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.error,
  fontSize: "16px",
  lineHeight: 1,
  padding: `2px ${vars.space["1"]}`,
  borderRadius: vars.radius.sm,
  selectors: {
    "&:hover": { background: `${vars.color.error}14` },
  },
});

export const columnList = style({
  flex: 1,
  overflowY: "auto",
  padding: `${vars.space["2"]} 0`,
});

export const columnItem = style({
  padding: `6px 14px`,
  borderBottom: `1px solid ${vars.color.surfaceTertiary}`,
  display: "flex",
  flexDirection: "column",
  gap: vars.space["1"],
});

export const columnRow = style({
  display: "flex",
  gap: "6px",
  alignItems: "center",
});

export const columnInput = style({
  flex: 1,
  fontSize: "13px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "3px",
  padding: `2px ${vars.space["1"]}`,
  outline: "none",
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 2px ${vars.color.focusRing}`,
    },
  },
});

export const deleteColumnBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textDisabled,
  fontSize: "14px",
  lineHeight: 1,
  padding: `2px ${vars.space["1"]}`,
  borderRadius: vars.radius.sm,
  selectors: {
    "&:hover": { color: vars.color.error },
  },
});

export const typeSelect = style({
  fontSize: "12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "3px",
  padding: `2px ${vars.space["1"]}`,
  color: vars.color.textSecondary,
  background: vars.color.surfaceTertiary,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary },
  },
});

export const checkboxRow = style({
  display: "flex",
  gap: vars.space["3"],
});

export const checkboxLabel = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["1"],
  color: vars.color.textSecondary,
  cursor: "pointer",
  userSelect: "none",
});

export const panelFooter = style({
  padding: `10px 14px`,
  borderTop: `1px solid ${vars.color.border}`,
});

export const addColumnBtn = style({
  width: "100%",
  padding: `6px 0`,
  background: vars.color.surfaceSecondary,
  border: `1px dashed ${vars.color.borderStrong}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  color: vars.color.textSecondary,
  fontSize: "13px",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary, color: vars.color.textPrimary },
  },
});

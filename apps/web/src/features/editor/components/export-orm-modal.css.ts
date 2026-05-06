import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const tabRow = style({
  display: "flex",
  borderBottom: `1px solid ${vars.color.border}`,
});

export const tab = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: vars.color.textSecondary,
  fontFamily: vars.font.family,
  borderBottom: "2px solid transparent",
  marginBottom: "-1px",
  transition: "color 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover": { color: vars.color.textPrimary },
  },
});

export const tabActive = style({
  color: vars.color.primary,
  borderBottomColor: vars.color.primary,
  fontWeight: "600",
});

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space["2"],
});

export const filenameLabel = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `3px ${vars.space["2"]}`,
});

export const toolbarBtns = style({
  display: "flex",
  gap: vars.space["2"],
});

export const actionBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "background 150ms ease, color 150ms ease",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const copySuccessBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: "1px solid #16a34a",
  borderRadius: vars.radius.md,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const emptyText = style({
  textAlign: "center",
  color: vars.color.textSecondary,
  fontSize: "13px",
  padding: `${vars.space["6"]} 0`,
});

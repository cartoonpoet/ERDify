import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const tabRow = style({
  display: "flex",
  gap: vars.space["1"],
  borderBottom: `1px solid ${vars.color.border}`,
  paddingBottom: vars.space["2"],
});

export const tab = style({
  padding: `5px ${vars.space["3"]}`,
  border: "none",
  borderRadius: `${vars.radius.sm} ${vars.radius.sm} 0 0`,
  background: "none",
  color: vars.color.textSecondary,
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "color 150ms ease, background 150ms ease",
  selectors: {
    "&:hover": { color: vars.color.textPrimary, background: vars.color.surfaceSecondary },
  },
});

export const tabActive = style({
  color: vars.color.primary,
  background: vars.color.selectedBg,
  fontWeight: "600",
});

export const toolbar = style({
  display: "flex",
  justifyContent: "flex-end",
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
  border: `1px solid #16a34a`,
  borderRadius: vars.radius.md,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const codeBlock = style({
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  fontSize: "12px",
  lineHeight: "1.6",
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: vars.space["4"],
  overflowX: "auto",
  overflowY: "auto",
  maxHeight: "440px",
  whiteSpace: "pre",
  color: vars.color.textPrimary,
  margin: 0,
});

export const emptyText = style({
  textAlign: "center",
  color: vars.color.textSecondary,
  fontSize: "13px",
  padding: `${vars.space["6"]} 0`,
});

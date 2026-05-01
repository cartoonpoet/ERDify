import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
});

export const description = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  lineHeight: "1.5",
  margin: 0,
});

export const generateBtn = style({
  alignSelf: "flex-start",
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "opacity 150ms ease",
  selectors: {
    "&:hover:not(:disabled)": { opacity: 0.85 },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
});

export const keyBox = style({
  display: "flex",
  gap: vars.space["2"],
  alignItems: "stretch",
});

export const keyText = style({
  flex: 1,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  fontSize: "11px",
  padding: vars.space["2"],
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.textPrimary,
  wordBreak: "break-all",
  lineHeight: "1.5",
  userSelect: "all",
});

export const copyBtn = style({
  flexShrink: 0,
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
    "&:hover": {
      background: vars.color.surfaceSecondary,
      color: vars.color.textPrimary,
    },
  },
});

export const copySuccessBtn = style({
  flexShrink: 0,
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

export const warning = style({
  fontSize: "12px",
  color: "#b45309",
  background: "#fef3c7",
  border: "1px solid #fcd34d",
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  lineHeight: "1.5",
  margin: 0,
});

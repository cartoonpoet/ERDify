import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const container = style({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: vars.color.surface,
  fontFamily: vars.font.family,
  overflow: "hidden",
});

export const inputRow = style({
  display: "flex",
  alignItems: "center",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  gap: vars.space["2"],
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const searchIcon = style({
  color: vars.color.textSecondary,
  fontSize: 14,
  flexShrink: 0,
});

export const input = style({
  flex: 1,
  border: "none",
  outline: "none",
  fontSize: 14,
  color: vars.color.textPrimary,
  background: "transparent",
  fontFamily: vars.font.family,
  "::placeholder": { color: vars.color.textSecondary },
});

export const resultList = style({
  flex: 1,
  overflowY: "auto",
});

export const resultItem = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  background: "none",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  gap: vars.space["2"],
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const resultItemActive = style({
  background: `${vars.color.primary}12`,
  selectors: {
    "&:hover": { background: `${vars.color.primary}1a` },
  },
});

export const resultName = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.textPrimary,
  fontFamily: "monospace",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
});

export const resultMeta = style({
  fontSize: 11,
  color: vars.color.textSecondary,
  flexShrink: 0,
});

export const footer = style({
  borderTop: `1px solid ${vars.color.border}`,
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  fontSize: 11,
  color: vars.color.textSecondary,
  display: "flex",
  justifyContent: "space-between",
  flexShrink: 0,
});

export const empty = style({
  padding: `${vars.space["4"]} ${vars.space["3"]}`,
  textAlign: "center",
  fontSize: 13,
  color: vars.color.textSecondary,
});

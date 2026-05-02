import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const backdrop = style({
  position: "absolute",
  inset: 0,
  zIndex: 1100,
});

export const panel = style({
  position: "absolute",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1101,
  width: 400,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  boxShadow: "0 12px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)",
  overflow: "hidden",
  fontFamily: vars.font.family,
});

export const inputRow = style({
  display: "flex",
  alignItems: "center",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  gap: vars.space["2"],
  borderBottom: `1px solid ${vars.color.border}`,
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

export const closeBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textSecondary,
  fontSize: 16,
  padding: "0 2px",
  lineHeight: 1,
  flexShrink: 0,
  selectors: { "&:hover": { color: vars.color.textPrimary } },
});

export const resultList = style({
  maxHeight: 380,
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
});

export const empty = style({
  padding: `${vars.space["4"]} ${vars.space["3"]}`,
  textAlign: "center",
  fontSize: 13,
  color: vars.color.textSecondary,
});

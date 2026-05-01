import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  padding: vars.space["4"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
  minWidth: "360px",
});

export const description = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  lineHeight: 1.6,
  margin: 0,
});

export const presetRow = style({
  display: "flex",
  gap: vars.space["2"],
  flexWrap: "wrap",
});

export const presetBtn = style({
  flex: 1,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1.5px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "border-color 150ms ease, background 150ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: vars.color.surfaceSecondary,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

export const linkBox = style({
  display: "flex",
  gap: vars.space["2"],
  alignItems: "center",
});

export const linkInput = style({
  flex: 1,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceSecondary,
  color: vars.color.textPrimary,
  fontSize: "12px",
  fontFamily: vars.font.family,
  outline: "none",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const copyBtn = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  whiteSpace: "nowrap",
  transition: "background 150ms ease",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const expiry = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  margin: 0,
});

export const sectionLabel = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textPrimary,
  margin: 0,
});

export const divider = style({
  height: "1px",
  background: vars.color.border,
});

export const errorText = style({
  fontSize: "12px",
  color: vars.color.error,
  margin: 0,
});

export const revokeBtn = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1.5px solid ${vars.color.error}`,
  background: "transparent",
  color: vars.color.error,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
  alignSelf: "flex-start",
  selectors: {
    "&:hover": { background: "rgba(239, 68, 68, 0.06)" },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
});

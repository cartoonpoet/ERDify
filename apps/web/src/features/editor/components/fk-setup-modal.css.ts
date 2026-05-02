import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  padding: `${vars.space["4"]} ${vars.space["5"]}`,
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
  minWidth: 420,
});

export const description = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  margin: 0,
});

export const pkRow = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: `${vars.space["3"]} ${vars.space["3"]}`,
  background: vars.color.surfaceTertiary,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
});

export const pkLabel = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textPrimary,
  fontFamily: "monospace",
});

export const modeRow = style({
  display: "flex",
  gap: vars.space["3"],
  alignItems: "center",
});

export const radioLabel = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  color: vars.color.textSecondary,
  cursor: "pointer",
});

export const textInput = style({
  flex: 1,
  padding: `5px 8px`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "12px",
  fontFamily: "monospace",
  outline: "none",
  color: vars.color.textPrimary,
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const colSelect = style({
  flex: 1,
  padding: `5px 8px`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "12px",
  fontFamily: "monospace",
  background: vars.color.surface,
  color: vars.color.textPrimary,
  outline: "none",
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const footer = style({
  display: "flex",
  gap: vars.space["2"],
  justifyContent: "flex-end",
  marginTop: vars.space["1"],
});

export const cancelBtn = style({
  padding: `6px ${vars.space["4"]}`,
  background: vars.color.surfaceSecondary,
  border: "none",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  fontSize: "13px",
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const confirmBtn = style({
  padding: `6px ${vars.space["4"]}`,
  background: vars.color.primary,
  color: vars.color.surface,
  border: "none",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  fontSize: "13px",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: vars.color.primaryHover },
  },
});

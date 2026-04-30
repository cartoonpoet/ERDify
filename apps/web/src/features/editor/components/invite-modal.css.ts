import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  padding: `${vars.space["4"]} ${vars.space["5"]}`,
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const successContainer = style({
  padding: `${vars.space["6"]} ${vars.space["5"]}`,
  textAlign: "center",
});

export const successIcon = style({
  fontSize: "32px",
  marginBottom: vars.space["2"],
});

export const successText = style({
  color: vars.color.success,
  fontWeight: "600",
  margin: 0,
});

export const successCloseBtn = style({
  marginTop: vars.space["4"],
  padding: `6px ${vars.space["5"]}`,
  background: vars.color.textPrimary,
  color: vars.color.surface,
  border: "none",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  fontSize: "13px",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { opacity: 0.85 },
  },
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const fieldLabel = style({
  fontSize: "13px",
  fontWeight: "500",
  color: vars.color.textPrimary,
});

export const textInput = style({
  padding: `7px 10px`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "13px",
  outline: "none",
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const roleSelect = style({
  padding: `7px 10px`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "13px",
  background: vars.color.surface,
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  outline: "none",
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const errorText = style({
  color: vars.color.error,
  fontSize: "12px",
  margin: 0,
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

export const submitBtn = style({
  padding: `6px ${vars.space["4"]}`,
  background: vars.color.primary,
  color: vars.color.surface,
  border: "none",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  fontSize: "13px",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
  selectors: {
    "&:hover:not(:disabled)": { background: vars.color.primaryHover },
    "&:disabled": { background: vars.color.textDisabled, cursor: "not-allowed" },
  },
});

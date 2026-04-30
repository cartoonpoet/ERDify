import { style } from "@vanilla-extract/css";
import { vars } from "../tokens.css";

export const wrapper = style({ display: "flex", flexDirection: "column", gap: vars.space["1"] });

export const label = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textPrimary,
});

export const inputBase = style({
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "14px",
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  background: vars.color.surface,
  outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  "::placeholder": { color: vars.color.textDisabled },
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const inputError = style({
  borderColor: vars.color.error,
  selectors: {
    "&:focus": {
      borderColor: vars.color.error,
      boxShadow: `0 0 0 3px ${vars.color.errorFocusRing}`,
    },
  },
});

export const errorText = style({
  fontSize: "11px",
  color: vars.color.error,
});

import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../tokens.css";

export const buttonRecipe = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: vars.space["2"],
    borderRadius: vars.radius.pill,
    border: "none",
    cursor: "pointer",
    fontFamily: vars.font.family,
    fontWeight: "500",
    letterSpacing: "-0.14px",
    transition: "background 200ms ease, transform 150ms ease, opacity 150ms ease",
    outline: "none",
    textDecoration: "none",
    whiteSpace: "nowrap",
    selectors: {
      "&:focus-visible": {
        boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
        outline: `2px solid ${vars.color.primary}`,
      },
      "&:disabled": {
        cursor: "not-allowed",
        opacity: 0.5,
        pointerEvents: "none",
      },
    },
  },
  variants: {
    variant: {
      primary: {
        background: vars.color.primary,
        color: "#fff",
        selectors: {
          "&:hover:not(:disabled)": { background: vars.color.primaryHover },
          "&:active:not(:disabled)": { background: vars.color.primaryPressed },
        },
      },
      secondary: {
        background: "transparent",
        color: vars.color.textPrimary,
        border: `1.5px solid ${vars.color.border}`,
        selectors: {
          "&:hover:not(:disabled)": { background: vars.color.surfaceSecondary },
        },
      },
      ghost: {
        background: "transparent",
        color: vars.color.primary,
        selectors: {
          "&:hover:not(:disabled)": { background: vars.color.selectedBg },
        },
      },
    },
    size: {
      sm: { padding: "5px 14px", fontSize: "12px" },
      md: { padding: "8px 18px", fontSize: "13px" },
      lg: { padding: "11px 22px", fontSize: "14px" },
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

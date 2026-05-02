import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../../design-system/tokens.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  height: "100vh",
});

export const topbar = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  gap: vars.space["2"],
  alignItems: "center",
  background: vars.color.surface,
});

export const backBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textSecondary,
  fontSize: "18px",
  lineHeight: 1,
  padding: `2px ${vars.space["1"]}`,
  display: "flex",
  alignItems: "center",
  borderRadius: vars.radius.sm,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 2,
      borderRadius: 4,
    },
  },
});

export const diagramName = style({
  fontWeight: "600",
  fontSize: "14px",
  color: vars.color.textPrimary,
});

export const statusText = style({
  fontSize: "12px",
  color: vars.color.textDisabled,
});

export const spacer = style({ flex: 1 });

export const topbarBtn = recipe({
  base: {
    padding: `4px ${vars.space["3"]}`,
    border: "none",
    borderRadius: vars.radius.sm,
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: vars.font.family,
    transition: "background 150ms ease",
  },
  variants: {
    variant: {
      secondary: {
        background: vars.color.surfaceSecondary,
        color: vars.color.textPrimary,
        border: `1px solid ${vars.color.border}`,
        selectors: { "&:hover": { background: vars.color.surfaceTertiary } },
      },
      dark: {
        background: vars.color.textPrimary,
        color: vars.color.surface,
        selectors: { "&:hover": { background: "#2a3543" } },
      },
      success: {
        background: vars.color.success,
        color: vars.color.surface,
        selectors: {
          "&:hover:not(:disabled)": { opacity: 0.9 },
          "&:disabled": { background: vars.color.textDisabled, cursor: "not-allowed" },
        },
      },
      historyActive: {
        background: vars.color.primary,
        color: vars.color.surface,
      },
      historyInactive: {
        background: vars.color.surfaceSecondary,
        color: vars.color.textPrimary,
        selectors: { "&:hover": { background: vars.color.surfaceTertiary } },
      },
    },
  },
  defaultVariants: { variant: "secondary" },
});

export const content = style({
  flex: 1,
  display: "flex",
  overflow: "hidden",
  position: "relative",
});

export const canvasArea = style({
  flex: 1,
  position: "relative",
});

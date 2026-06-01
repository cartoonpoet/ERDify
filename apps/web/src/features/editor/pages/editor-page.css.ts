import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/style/tokens.css";

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

export const breadcrumb = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "13px",
});

export const breadcrumbSegment = style({
  color: vars.color.textSecondary,
  fontWeight: 500,
});

export const breadcrumbSep = style({
  color: vars.color.textDisabled,
  fontSize: "11px",
  userSelect: "none",
});

export const breadcrumbCurrent = style({
  fontWeight: "600",
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
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  variants: {
    variant: {
      secondary: {
        background: vars.color.surfaceSecondary,
        color: vars.color.textPrimary,
        border: `1px solid ${vars.color.border}`,
        selectors: { "&:hover": { background: vars.color.surfaceTertiary } },
      },
      ghost: {
        background: "none",
        color: vars.color.textSecondary,
        border: `1px solid transparent`,
        selectors: {
          "&:hover": {
            background: vars.color.surfaceSecondary,
            borderColor: vars.color.border,
            color: vars.color.textPrimary,
          },
        },
      },
      dark: {
        background: vars.color.textPrimary,
        color: vars.color.surface,
        selectors: { "&:hover": { background: "#2a3543" } },
      },
      primary: {
        background: vars.color.primary,
        color: vars.color.surface,
        selectors: { "&:hover": { opacity: 0.9 } },
      },
      success: {
        background: vars.color.success,
        color: vars.color.surface,
        selectors: {
          "&:hover:not(:disabled)": { opacity: 0.9 },
          "&:disabled": { background: vars.color.textDisabled, cursor: "not-allowed" },
        },
      },
    },
  },
  defaultVariants: { variant: "secondary" },
});

export const topbarDivider = style({
  width: 1,
  height: 20,
  background: vars.color.border,
  flexShrink: 0,
  margin: `0 ${vars.space["1"]}`,
});

export const presenceGroup = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["1"],
});

export const inviteBtn = style({
  width: 26,
  height: 26,
  borderRadius: "50%",
  border: `2px dashed ${vars.color.borderStrong}`,
  background: vars.color.surfaceSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  color: vars.color.textDisabled,
  cursor: "pointer",
  transition: "all 150ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      color: vars.color.primary,
      background: vars.color.selectedBg,
    },
  },
});

export const fileDropdownWrap = style({
  position: "relative",
  flexShrink: 0,
});

export const fileDropdownMenu = style({
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  zIndex: 200,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
  minWidth: 168,
  overflow: "hidden",
  padding: "4px 0",
});

export const fileDropdownItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: 13,
  color: vars.color.textPrimary,
  cursor: "pointer",
  fontWeight: 500,
  background: "none",
  border: "none",
  width: "100%",
  fontFamily: vars.font.family,
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const fileDropdownSep = style({
  height: 1,
  background: vars.color.border,
  margin: "4px 0",
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

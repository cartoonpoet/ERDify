import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const drawer = style({
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: "320px",
  background: vars.color.surface,
  borderLeft: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  zIndex: 10,
  boxShadow: vars.shadow.md,
});

export const drawerHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const drawerTitle = style({
  margin: 0,
  fontSize: "14px",
  fontWeight: "600",
  color: vars.color.textPrimary,
});

export const closeBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  color: vars.color.textSecondary,
  padding: "2px",
  borderRadius: vars.radius.sm,
  lineHeight: 1,
  selectors: {
    "&:hover": { color: vars.color.textPrimary, background: vars.color.surfaceSecondary },
  },
});

export const filterRow = style({
  display: "flex",
  flexDirection: "row",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  borderRadius: "20px",
  padding: `4px 12px`,
  fontSize: "12px",
  fontFamily: vars.font.family,
  cursor: "pointer",
  border: `1px solid ${vars.color.border}`,
  background: "none",
  color: vars.color.textSecondary,
  transition: "all 150ms ease",
  selectors: {
    "&:hover": { borderColor: vars.color.borderStrong, color: vars.color.textPrimary },
  },
});

export const chipOn = style({
  borderColor: vars.color.primary,
  background: vars.color.selectedBg,
  color: vars.color.textPrimary,
});

export const chipDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  flexShrink: 0,
});

export const drawerBody = style({
  flex: 1,
  overflowY: "auto",
});

export const emptyText = style({
  color: vars.color.textDisabled,
  fontSize: "13px",
  margin: vars.space["4"],
});

export const activityItem = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  gap: vars.space["3"],
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const itemIcon = style({
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: "11px",
  fontWeight: "600",
});

export const itemIconHuman = style({
  background: "color-mix(in srgb, #60a5fa 15%, transparent)",
  color: "#2563eb",
});

export const itemIconAi = style({
  background: "color-mix(in srgb, #a78bfa 15%, transparent)",
  color: "#7c3aed",
});

export const itemBody = style({
  flex: 1,
  minWidth: 0,
});

export const itemSummary = style({
  fontSize: "12px",
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  margin: 0,
});

export const itemMeta = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  marginTop: "2px",
});

export const itemRevertBtn = style({
  marginTop: vars.space["1"],
  padding: `2px 8px`,
  fontSize: "11px",
  background: "none",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  fontFamily: vars.font.family,
  color: vars.color.textSecondary,
  transition: "all 150ms ease",
  selectors: {
    "&:hover:not(:disabled)": {
      borderColor: vars.color.borderStrong,
      color: vars.color.textPrimary,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

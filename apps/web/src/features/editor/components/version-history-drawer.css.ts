import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

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

export const drawerBody = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space["4"],
});

export const emptyText = style({
  color: vars.color.textDisabled,
  fontSize: "13px",
  margin: 0,
});

export const versionList = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const versionItem = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: `10px ${vars.space["3"]}`,
  background: vars.color.surfaceTertiary,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
});

export const versionLabel = style({
  fontSize: "13px",
  fontWeight: "600",
  color: vars.color.textPrimary,
});

export const versionDate = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  marginTop: "2px",
});

export const restoreBtn = style({
  padding: `4px 10px`,
  fontSize: "12px",
  background: vars.color.textPrimary,
  color: vars.color.surface,
  border: "none",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "opacity 150ms ease",
  selectors: {
    "&:hover:not(:disabled)": { opacity: 0.8 },
    "&:disabled": { background: vars.color.textDisabled, cursor: "not-allowed" },
  },
});

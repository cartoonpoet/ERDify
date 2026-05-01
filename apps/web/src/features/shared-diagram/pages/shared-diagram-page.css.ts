import { style } from "@vanilla-extract/css";
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
  alignItems: "center",
  gap: vars.space["2"],
  background: vars.color.surface,
});

export const diagramName = style({
  fontWeight: "600",
  fontSize: "14px",
  color: vars.color.textPrimary,
});

export const readOnlyBadge = style({
  fontSize: "11px",
  fontWeight: "500",
  color: vars.color.textSecondary,
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.pill,
  padding: `2px 8px`,
});

export const content = style({
  flex: 1,
  display: "flex",
  overflow: "hidden",
});

export const errorPage = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  gap: vars.space["3"],
  color: vars.color.textSecondary,
  fontSize: "14px",
});

export const errorTitle = style({
  fontSize: "18px",
  fontWeight: "700",
  color: vars.color.textPrimary,
});

import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const page = style({
  padding: vars.space["6"],
  flex: 1,
  overflowY: "auto",
});

export const header = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: vars.space["6"],
});

export const title = style({
  fontSize: vars.font.size.lg,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary,
  margin: 0,
});

export const subtitle = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  marginTop: vars.space["1"],
});

export const section = style({
  marginBottom: vars.space["6"],
});

export const sectionLabel = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.7px",
  textTransform: "uppercase",
  marginBottom: vars.space["2"],
});

export const card = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  overflow: "hidden",
  boxShadow: vars.shadow.sm,
});

export const memberRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.surfaceSecondary}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const avatar = style({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: vars.color.primary,
  color: "#fff",
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const avatarPending = style({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: vars.color.surfaceSecondary,
  color: vars.color.textDisabled,
  fontSize: vars.font.size.md,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const memberInfo = style({
  flex: 1,
  minWidth: 0,
});

export const memberEmail = style({
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const youBadge = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  display: "inline-block",
  marginLeft: vars.space["1"],
});

export const roleBadge = style({
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.sm,
  padding: `${vars.space["1"]} ${vars.space["2"]}`,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.semibold,
  color: vars.color.textSecondary,
  flexShrink: 0,
});

export const pendingBadge = style({
  background: vars.color.selectedBg,
  borderRadius: vars.radius.sm,
  padding: `${vars.space["1"]} ${vars.space["2"]}`,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.medium,
  color: vars.color.primary,
  flexShrink: 0,
});

export const roleSelect = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `${vars.space["1"]} ${vars.space["2"]}`,
  fontSize: vars.font.size.xs,
  color: vars.color.textPrimary,
  cursor: "pointer",
  outline: "none",
  fontFamily: vars.font.family,
  flexShrink: 0,
  selectors: { "&:focus": { borderColor: vars.color.primary } },
});

export const expiry = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  marginTop: "2px",
});

export const expiryExpired = style({
  fontSize: vars.font.size.xs,
  color: vars.color.error,
  marginTop: "2px",
});

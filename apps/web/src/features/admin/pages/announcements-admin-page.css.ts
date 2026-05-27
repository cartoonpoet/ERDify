import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const page = style({
  background: vars.color.surfaceTertiary, display: "flex",
  flexDirection: "column", overflow: "hidden", flex: 1,
});

export const pageHeader = style({
  padding: `${vars.space["5"]} ${vars.space["6"]} ${vars.space["4"]}`,
  display: "flex", alignItems: "center", gap: vars.space["3"],
  background: vars.color.surface, borderBottom: `1px solid ${vars.color.border}`,
});

export const pageTitle = style({
  fontSize: "16px", fontWeight: "700", color: vars.color.textPrimary,
  letterSpacing: "-0.3px", flex: 1,
});

export const listArea = style({
  flex: 1, overflowY: "auto", padding: vars.space["5"],
  display: "flex", flexDirection: "column", gap: vars.space["3"],
});

export const announcementCard = style({
  background: vars.color.surface, borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`, padding: vars.space["4"],
  display: "flex", flexDirection: "column", gap: vars.space["2"],
});

export const cardTop = style({
  display: "flex", alignItems: "flex-start", gap: vars.space["2"],
});

export const cardTitle = style({
  fontSize: vars.font.size.md, fontWeight: vars.font.weight.semibold,
  color: vars.color.textPrimary, flex: 1,
});

export const cardMeta = style({
  fontSize: vars.font.size.sm, color: vars.color.textSecondary,
  display: "flex", gap: vars.space["2"], alignItems: "center",
});

export const expiredBadge = style({
  fontSize: vars.font.size.sm, padding: "1px 6px",
  borderRadius: vars.radius.sm, background: vars.color.surfaceSecondary,
  color: vars.color.textDisabled,
});

export const activeBadge = style({
  fontSize: vars.font.size.sm, padding: "1px 6px",
  borderRadius: vars.radius.sm, background: "#D1FAE5", color: "#065F46",
});

export const urgentBadge = style({
  fontSize: vars.font.size.sm, padding: "1px 6px",
  borderRadius: vars.radius.sm, background: "#FEF2F2", color: vars.color.error,
  fontWeight: vars.font.weight.semibold,
});

export const cardActions = style({
  display: "flex", gap: vars.space["2"], marginTop: vars.space["1"],
});

export const actionBtn = style({
  padding: `4px ${vars.space["3"]}`, borderRadius: vars.radius.pill,
  border: `1px solid ${vars.color.border}`, background: "transparent",
  color: vars.color.textSecondary, fontSize: vars.font.size.sm,
  cursor: "pointer", fontFamily: vars.font.family,
  selectors: { "&:hover": { background: vars.color.surfaceSecondary } },
});

export const deleteBtn = style({
  padding: `4px ${vars.space["3"]}`, borderRadius: vars.radius.pill,
  border: `1px solid ${vars.color.error}`, background: "transparent",
  color: vars.color.error, fontSize: vars.font.size.sm,
  cursor: "pointer", fontFamily: vars.font.family,
  selectors: { "&:hover": { background: "#FEF2F2" } },
});

export const emptyState = style({
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", flex: 1, gap: vars.space["3"],
  color: vars.color.textSecondary, fontSize: vars.font.size.md,
});

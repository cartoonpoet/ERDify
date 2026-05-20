import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

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

export const cardBody = style({
  padding: `${vars.space["4"]} ${vars.space["5"]}`,
});

export const descRow = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space["4"],
  marginBottom: vars.space["4"],
});

export const descText = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  lineHeight: "1.6",
  flex: 1,
});

export const statusRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["4"],
  padding: `${vars.space["3"]} ${vars.space["5"]}`,
  borderBottom: `1px solid ${vars.color.surfaceSecondary}`,
});

export const statusLabel = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  flex: 1,
});

export const statusBadgeSet = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
  color: vars.color.success,
});

export const statusBadgeUnset = style({
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  color: vars.color.textDisabled,
});

export const inputRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["5"]}`,
  flexWrap: "wrap",
});

export const input = style({
  flex: 1,
  minWidth: 200,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  outline: "none",
  background: vars.color.surface,
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const actionRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["5"]}`,
});

export const readonlyNote = style({
  padding: `${vars.space["3"]} ${vars.space["5"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textDisabled,
});

export const errorText = style({
  padding: `0 ${vars.space["5"]} ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.error,
});

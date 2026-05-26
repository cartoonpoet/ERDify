import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const statusAccepted = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.md,
  background: "#f0fdf4",
  border: "1px solid #86efac",
  fontSize: vars.font.size.md,
  color: "#16a34a",
  fontWeight: vars.font.weight.medium,
});

export const statusRejected = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.md,
  background: "#fef2f2",
  border: "1px solid #fca5a5",
  fontSize: vars.font.size.md,
  color: "#dc2626",
  fontWeight: vars.font.weight.medium,
});

export const card = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space["3"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceSecondary,
  marginTop: vars.space["2"],
});

export const summary = style({
  fontSize: vars.font.size.md,
  color: vars.color.textSecondary,
});

export const reviewBtn = style({
  padding: `4px ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: "none",
  background: vars.color.primary,
  color: "#fff",
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
  cursor: "pointer",
  fontFamily: vars.font.family,
  whiteSpace: "nowrap",
  selectors: {
    "&:hover": { background: vars.color.primaryHover },
  },
});

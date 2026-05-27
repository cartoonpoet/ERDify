import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const root = style({ padding: `${vars.space["4"]} ${vars.space["5"]}`, minHeight: "120px" });

export const tag = style({
  display: "inline-flex", alignItems: "center", gap: "4px",
  padding: `2px ${vars.space["2"]}`, borderRadius: vars.radius.pill,
  fontSize: vars.font.size.sm, fontWeight: vars.font.weight.semibold,
  marginBottom: vars.space["2"],
});

export const tagMaintenance = style({ background: "#FEF3C7", color: "#92400E" });
export const tagError = style({ background: "#FEF2F2", color: "#991b1b" });
export const tagFeature = style({ background: vars.color.selectedBg, color: vars.color.primary });
export const tagGeneral = style({ background: vars.color.surfaceSecondary, color: vars.color.textSecondary });

export const slideTitle = style({
  fontSize: vars.font.size.lg, fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary, letterSpacing: "-0.2px", marginBottom: vars.space["2"],
});

export const slideBody = style({
  fontSize: vars.font.size.md, color: vars.color.textSecondary,
  lineHeight: "1.65", whiteSpace: "pre-wrap",
});

export const urgentNote = style({
  marginTop: vars.space["2"], fontSize: vars.font.size.sm,
  color: vars.color.error, fontWeight: vars.font.weight.medium,
  display: "flex", alignItems: "center", gap: "4px",
});

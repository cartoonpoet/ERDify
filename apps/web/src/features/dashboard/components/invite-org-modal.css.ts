import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const label = style({
  display: "block",
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  color: vars.color.textSecondary,
  marginBottom: vars.space["1"],
});

export const resultWrapper = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space["3"],
  padding: `${vars.space["5"]} 0 ${vars.space["3"]}`,
});

export const resultIcon = style({
  fontSize: "2rem",
});

export const resultText = style({
  fontSize: vars.font.size.md,
  color: vars.color.textPrimary,
  textAlign: "center",
});

export const resultFooter = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: vars.space["2"],
  marginTop: vars.space["2"],
  width: "100%",
});

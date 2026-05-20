import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

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

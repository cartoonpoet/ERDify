import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const form = style({ display: "flex", flexDirection: "column", gap: vars.space["4"] });
export const footer = style({ display: "flex", justifyContent: "flex-end", gap: vars.space["2"], marginTop: vars.space["2"] });
export const selectInput = style({
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "14px",
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  background: vars.color.surface,
  outline: "none",
  selectors: { "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.focusRing}` } },
});

import { style } from "@vanilla-extract/css";
import { vars } from "../tokens.css";

export const card = style({
  background: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflow: "hidden",
});

export const cardHoverable = style({
  cursor: "pointer",
  transition: "box-shadow 200ms ease, transform 200ms ease",
  selectors: {
    "&:hover": {
      boxShadow: vars.shadow.md,
      transform: "translateY(-2px)",
    },
  },
});

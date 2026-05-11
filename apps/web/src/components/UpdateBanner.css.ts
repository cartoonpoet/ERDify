import { style } from "@vanilla-extract/css";
import { vars } from "../style/tokens.css";

export const banner = style({
  position: "fixed",
  bottom: vars.space["5"],
  left: "50%",
  transform: "translateX(-50%)",
  background: vars.color.textPrimary,
  color: "#fff",
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.lg,
  display: "flex",
  alignItems: "center",
  gap: vars.space["4"],
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  fontSize: vars.font.size.md,
  fontFamily: vars.font.family,
  zIndex: 9999,
  whiteSpace: "nowrap",
});

export const message = style({
  fontWeight: vars.font.weight.medium,
  color: "rgba(255,255,255,0.85)",
});

export const refreshBtn = style({
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.sm,
  padding: `5px ${vars.space["3"]}`,
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.semibold,
  fontFamily: vars.font.family,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.primaryHover },
  },
});

export const dismissBtn = style({
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.5)",
  cursor: "pointer",
  padding: "2px",
  display: "flex",
  alignItems: "center",
  selectors: {
    "&:hover": { color: "rgba(255,255,255,0.9)" },
  },
});

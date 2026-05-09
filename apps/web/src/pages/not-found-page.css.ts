import { style } from "@vanilla-extract/css";
import { vars } from "../style/tokens.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  gap: vars.space["3"],
});

export const icon = style({
  fontSize: "48px",
  lineHeight: 1,
});

export const title = style({
  fontSize: "20px",
  fontWeight: "700",
  color: vars.color.textPrimary,
});

export const desc = style({
  fontSize: "14px",
  color: vars.color.textSecondary,
  textAlign: "center",
});

export const homeBtn = style({
  marginTop: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: "13px",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

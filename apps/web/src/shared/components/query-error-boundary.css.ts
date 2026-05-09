import { style } from "@vanilla-extract/css";
import { vars } from "../../design-system/tokens.css";

const base = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["3"],
  padding: vars.space["6"],
});

export const pageFallback = style([base, {
  height: "100vh",
}]);

export const inlineFallback = style([base, {
  width: "100%",
  height: "100%",
}]);

export const icon = style({
  fontSize: "40px",
  lineHeight: 1,
});

export const title = style({
  fontSize: "18px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  textAlign: "center",
});

export const desc = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  textAlign: "center",
  maxWidth: "320px",
});

export const backBtn = style({
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

import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const page = style({
  minHeight: "100vh",
  background: vars.color.surfaceSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space["6"],
});

export const card = style({
  background: vars.color.surface,
  borderRadius: vars.radius.xl,
  boxShadow: vars.shadow.lg,
  padding: `${vars.space["8"]} ${vars.space["7"]}`,
  width: "100%",
  maxWidth: "380px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

export const brand = style({
  fontSize: "22px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  letterSpacing: "-0.5px",
  marginBottom: "4px",
});

export const brandAccent = style({ color: vars.color.primary });

export const tagline = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  marginBottom: vars.space["7"],
});

export const form = style({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const authLink = style({
  textAlign: "center",
  fontSize: "13px",
  color: vars.color.textSecondary,
  marginTop: vars.space["2"],
});

export const authLinkAnchor = style({
  color: vars.color.primary,
  fontWeight: "500",
  cursor: "pointer",
  selectors: { "&:hover": { textDecoration: "underline" } },
});

export const strengthBars = style({
  display: "flex",
  gap: "4px",
  marginTop: "6px",
});

export const strengthBar = style({
  flex: 1,
  height: "3px",
  borderRadius: "2px",
  background: vars.color.border,
  transition: "background 200ms ease",
});

export const strengthBarFilled = style({
  background: vars.color.success,
});

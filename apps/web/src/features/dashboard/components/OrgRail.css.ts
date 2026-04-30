import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const rail = style({
  width: "52px",
  background: vars.color.surfaceSecondary,
  borderRight: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: `${vars.space["3"]} 0`,
  gap: vars.space["2"],
  flexShrink: 0,
});

export const orgIconBase = style({
  width: "32px",
  height: "32px",
  borderRadius: vars.radius.org,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
  border: "none",
  transition: "transform 100ms ease, box-shadow 100ms ease",
  selectors: {
    "&:hover": { transform: "scale(1.08)" },
  },
});

export const orgIconVariants = styleVariants({
  active: {
    background: vars.color.primary,
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0, 100, 224, 0.35)",
  },
  inactive: {
    background: vars.color.surface,
    color: vars.color.textSecondary,
    border: `1px solid ${vars.color.border}`,
  },
});

export const addBtn = style({
  width: "32px",
  height: "32px",
  borderRadius: vars.radius.org,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  cursor: "pointer",
  background: "transparent",
  color: vars.color.textSecondary,
  border: `1.5px dashed ${vars.color.borderStrong}`,
  marginTop: "auto",
  marginBottom: vars.space["1"],
  transition: "background 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover": {
      background: vars.color.surface,
      borderColor: vars.color.primary,
      color: vars.color.primary,
    },
  },
});

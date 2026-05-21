import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const wrapper = style({
  position: "relative",
});

export const noSchemaStrip = style({
  display: "flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 10px 3px 12px",
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  borderBottom: "var(--strip-border, 1px dashed rgba(0,0,0,.08))",
  background: "var(--strip-bg, transparent)",
  color: "var(--strip-color, #c4cad4)",
  transition: "background .12s, color .12s, border-color .12s",
  cursor: "pointer",
  userSelect: "none",
});

export const noSchemaDot = style({
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: "var(--dot-bg, #d1d9e0)",
  flexShrink: 0,
  transition: "background .12s",
});

export const schemaStrip = style({
  display: "flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 10px 3px 12px",
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  borderBottom: "var(--strip-border)",
  background: "var(--strip-bg)",
  color: "var(--strip-color)",
  transition: "background .12s, border-color .12s",
  cursor: "pointer",
  userSelect: "none",
});

export const arrowSpan = style({
  fontSize: 8,
  transition: "opacity .12s",
  marginLeft: 2,
});

export const hintSpan = style({
  marginLeft: "auto",
  fontSize: 8,
  transition: "opacity .12s",
  letterSpacing: "normal",
  textTransform: "none",
  fontWeight: Number(vars.font.weight.medium),
});

export const backdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 999,
});

export const dropdownContainer = style({
  position: "absolute",
  top: "calc(100% + 3px)",
  left: 0,
  zIndex: 1000,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  boxShadow: "0 4px 16px rgba(0,0,0,.12)",
  minWidth: 168,
  overflow: "hidden",
});

export const inputWrapper = style({
  padding: "6px 8px",
  borderBottom: "1px solid #F1F4F7",
});

export const dropdownInput = style({
  width: "100%",
  padding: "4px 8px",
  fontSize: vars.font.size.sm,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 5,
  outline: "none",
  boxSizing: "border-box",
});

export const optionButton = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  padding: "6px 10px",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: vars.font.size.sm,
});

export const optionButtonDefault = style([
  optionButton,
  {
    background: "none",
    color: "#374151",
    fontWeight: Number(vars.font.weight.regular),
  },
]);

export const optionButtonSelected = style([
  optionButton,
  {
    background: vars.color.selectedBg,
    color: vars.color.primary,
    fontWeight: Number(vars.font.weight.medium),
  },
]);

export const optionDot = style({
  width: 7,
  height: 7,
  borderRadius: "50%",
  flexShrink: 0,
});

export const createButton = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  padding: "6px 10px",
  background: "none",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: vars.font.size.sm,
  color: vars.color.primary,
});

export const divider = style({
  height: 1,
  background: "#F1F4F7",
});

export const removeButton = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  padding: "6px 10px",
  background: "none",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: vars.font.size.sm,
  color: "#9CA3AF",
});

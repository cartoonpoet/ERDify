import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const menu = style({
  position: "absolute",
  background: vars.color.surface,
  border: "1px solid #e2e8f0",
  borderRadius: vars.radius.md,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
  zIndex: 1000,
  minWidth: 160,
  fontSize: 12,
  overflow: "hidden",
});

export const menuItem = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "9px 14px",
  background: "none",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  color: "#374151",
  fontSize: 12,
  selectors: {
    "&:hover": {
      background: "#f1f5f9",
    },
  },
});

export const iconLg = style({
  fontSize: 14,
});

export const iconSm = style({
  fontSize: 13,
});

export const separator = style({
  height: 1,
  background: "#f1f5f9",
  margin: "0 8px",
});

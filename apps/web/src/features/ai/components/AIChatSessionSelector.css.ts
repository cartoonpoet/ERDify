import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const container = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `6px ${vars.space["4"]}`,
  background: "rgba(255,255,255,0.08)",
  borderTop: "1px solid rgba(255,255,255,0.12)",
  flexShrink: 0,
});

export const dropdownBtn = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space["1"],
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: vars.radius.sm,
  color: "#fff",
  fontSize: vars.font.size.sm,
  padding: `4px 10px`,
  cursor: "pointer",
  textAlign: "left",
  transition: "background 0.15s",
  selectors: {
    "&:hover": { background: "rgba(255,255,255,0.2)" },
  },
});

export const dropdownBtnLabel = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const dropdownArrow = style({
  flexShrink: 0,
  fontSize: "10px",
  opacity: 0.8,
  transition: "transform 0.15s",
});

export const dropdownArrowOpen = style({
  transform: "rotate(180deg)",
});

export const newSessionBtn = style({
  flexShrink: 0,
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: vars.radius.sm,
  color: "#fff",
  fontSize: vars.font.size.sm,
  padding: `4px 10px`,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background 0.15s",
  selectors: {
    "&:hover": { background: "rgba(255,255,255,0.3)" },
  },
});

export const dropdownList = style({
  position: "absolute",
  top: "calc(100% + 4px)",
  left: vars.space["4"],
  right: vars.space["4"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.xl,
  zIndex: 100,
  maxHeight: "200px",
  overflowY: "auto",
});

export const dropdownItem = style({
  display: "flex",
  alignItems: "center",
  padding: `8px ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
  cursor: "pointer",
  transition: "background 0.12s",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const dropdownItemActive = style({
  background: vars.color.surfaceSecondary,
  fontWeight: vars.font.weight.bold,
});

export const dropdownItemName = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const dropdownEmpty = style({
  padding: `10px ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textDisabled,
  textAlign: "center",
});

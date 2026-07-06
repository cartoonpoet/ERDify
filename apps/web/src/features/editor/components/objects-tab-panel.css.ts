import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const container = style({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

export const filterRow = style({
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  borderRadius: "20px",
  padding: `4px 12px`,
  fontSize: "12px",
  fontFamily: vars.font.family,
  cursor: "pointer",
  border: `1px solid ${vars.color.border}`,
  background: "none",
  color: vars.color.textSecondary,
  transition: "all 150ms ease",
  selectors: {
    "&:hover": { borderColor: vars.color.borderStrong, color: vars.color.textPrimary },
  },
});

export const chipOn = style({
  borderColor: vars.color.primary,
  background: vars.color.selectedBg,
  color: vars.color.textPrimary,
});

export const chipDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  flexShrink: 0,
});

export const listBody = style({
  flex: 1,
  overflowY: "auto",
});

export const emptyText = style({
  color: vars.color.textDisabled,
  fontSize: "13px",
  margin: vars.space["4"],
});

export const objectRow = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: vars.space["3"],
  width: "100%",
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  border: "none",
  background: "none",
  cursor: "pointer",
  fontFamily: vars.font.family,
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

const kindBadgeBase = style({
  flexShrink: 0,
  fontSize: "11px",
  fontWeight: "600",
  padding: "2px 8px",
  borderRadius: vars.radius.sm,
  whiteSpace: "nowrap",
});

export const kindBadge = styleVariants({
  procedure: [
    kindBadgeBase,
    {
      background: "color-mix(in srgb, #60a5fa 15%, transparent)",
      color: "#2563eb",
    },
  ],
  function: [
    kindBadgeBase,
    {
      background: "color-mix(in srgb, #34d399 15%, transparent)",
      color: "#059669",
    },
  ],
  trigger: [
    kindBadgeBase,
    {
      background: "color-mix(in srgb, #fbbf24 15%, transparent)",
      color: "#d97706",
    },
  ],
  view: [
    kindBadgeBase,
    {
      background: "color-mix(in srgb, #a78bfa 15%, transparent)",
      color: "#7c3aed",
    },
  ],
});

export const objectName = style({
  flex: 1,
  minWidth: 0,
  fontSize: "13px",
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const addRow = style({
  padding: vars.space["3"],
  borderTop: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const addBtn = style({
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: "13px",
  fontWeight: "600",
  fontFamily: vars.font.family,
  color: vars.color.primary,
  background: "none",
  border: `1px dashed ${vars.color.borderStrong}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  transition: "all 150ms ease",
  selectors: {
    "&:hover:not(:disabled)": {
      background: vars.color.selectedBg,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

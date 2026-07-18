import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const section = style({
  marginBottom: vars.space["6"],
});

export const sectionLabel = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.7px",
  textTransform: "uppercase",
  marginBottom: vars.space["2"],
});

export const card = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  overflow: "hidden",
  boxShadow: vars.shadow.sm,
});

export const cardBody = style({
  padding: `${vars.space["4"]} ${vars.space["5"]}`,
});

export const descRow = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space["4"],
  marginBottom: vars.space["4"],
});

export const descText = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  lineHeight: "1.6",
  flex: 1,
});

export const statusRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["4"],
  padding: `${vars.space["3"]} ${vars.space["5"]}`,
  borderBottom: `1px solid ${vars.color.surfaceSecondary}`,
});

export const statusLabel = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  flex: 1,
});

export const statusBadgeSet = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
  color: vars.color.success,
});

export const statusBadgeUnset = style({
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  color: vars.color.textDisabled,
});

export const inputRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["5"]}`,
  flexWrap: "wrap",
});

export const input = style({
  flex: 1,
  minWidth: 200,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  outline: "none",
  background: vars.color.surface,
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const actionRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["5"]}`,
});

export const providerRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["4"],
  padding: `${vars.space["3"]} ${vars.space["5"]} 0`,
});

export const providerLabel = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  fontSize: vars.font.size.sm,
  cursor: "pointer",
});

export const modelRow = style({
  padding: `${vars.space["2"]} ${vars.space["5"]} 0`,
});

export const modelSelect = style({
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
  background: vars.color.surface,
  fontFamily: vars.font.family,
  cursor: "pointer",
  outline: "none",
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const readonlyNote = style({
  padding: `${vars.space["3"]} ${vars.space["5"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textDisabled,
});

export const errorText = style({
  padding: `0 ${vars.space["5"]} ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.error,
});

export const providerHeader = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  marginBottom: vars.space["2"],
});

const providerIconBase = style({
  width: 18,
  height: 18,
  borderRadius: vars.radius.sm,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.bold,
  color: "#fff",
  flexShrink: 0,
});

export const providerIcon = styleVariants({
  anthropic: [providerIconBase, { background: "#D97706" }],
  openai: [providerIconBase, { background: "#10A37F" }],
  gemini: [providerIconBase, { background: "#4285F4" }],
});

export const providerSectionDivider = style({
  border: "none",
  borderTop: `1px solid ${vars.color.surfaceSecondary}`,
  margin: `${vars.space["3"]} 0`,
});

export const checkboxList = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  marginBottom: vars.space["2"],
});

// <button>으로 렌더링되므로(S6819) 기본 버튼 크롬(테두리/배경/폭/정렬/폰트)을 리셋한다.
export const checkboxItem = style({
  width: "100%",
  border: "none",
  background: "none",
  font: "inherit",
  textAlign: "left",
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `7px ${vars.space["2"]}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  userSelect: "none",
  transition: "background 0.1s",
  selectors: {
    "&:hover": {
      background: vars.color.surfaceTertiary,
    },
  },
});

export const checkboxItemSelected = style({
  background: vars.color.selectedBg,
  selectors: {
    "&:hover": {
      background: vars.color.selectedBg,
    },
  },
});

export const checkboxItemDisabled = style({
  pointerEvents: "none",
  opacity: 0.5,
});

export const customCheckbox = style({
  width: 16,
  height: 16,
  borderRadius: 4,
  border: `1.5px solid ${vars.color.borderStrong}`,
  background: vars.color.surface,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "all 0.1s",
});

export const customCheckboxChecked = style({
  background: vars.color.primary,
  borderColor: vars.color.primary,
});

export const checkboxLabel = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
});

const checkboxBadgeBase = style({
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.medium,
  borderRadius: vars.radius.pill,
  padding: `1px 7px`,
  whiteSpace: "nowrap",
});

export const checkboxBadge = styleVariants({
  blue:   [checkboxBadgeBase, { color: "#0064E0", background: "#EEF4FF" }],
  purple: [checkboxBadgeBase, { color: "#7C3AED", background: "#F5F3FF" }],
  green:  [checkboxBadgeBase, { color: "#059669", background: "#ECFDF5" }],
  gray:   [checkboxBadgeBase, { color: "#6B7280", background: "#F3F4F6" }],
});

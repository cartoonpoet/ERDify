import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const sidebar = style({
  width: "260px",
  background: vars.color.surface,
  borderRight: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
});

export const orgSelectorWrapper = style({
  position: "relative",
  outline: "none",
});

export const orgSelector = style({
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["3"]}`,
  border: "none",
  borderBottom: `1px solid ${vars.color.border}`,
  cursor: "pointer",
  background: "none",
  fontFamily: vars.font.family,
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const orgBadge = style({
  width: "30px",
  height: "30px",
  borderRadius: vars.radius.org,
  background: vars.color.selectedBg,
  color: vars.color.primary,
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.bold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const orgInfo = style({
  flex: 1,
  minWidth: 0,
  textAlign: "left",
});

export const orgName = style({
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary,
});

export const orgSub = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  marginTop: "1px",
});

export const orgChevron = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
});

export const orgPlaceholder = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textDisabled,
  flex: 1,
});

export const orgDropdown = style({
  position: "absolute",
  top: "100%",
  left: 0,
  zIndex: 200,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.md,
  minWidth: "100%",
  overflow: "hidden",
});

export const orgDropdownItemWrapper = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

export const orgDropdownItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const orgDropdownDeleteBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textDisabled,
  fontSize: vars.font.size.md,
  padding: "2px 4px",
  borderRadius: vars.radius.sm,
  opacity: 0,
  transition: "opacity 150ms ease, color 150ms ease",
  flexShrink: 0,
  marginRight: vars.space["2"],
  lineHeight: 1,
  selectors: {
    "&:hover": { color: vars.color.error },
    [`${orgDropdownItemWrapper}:hover &`]: { opacity: 1 },
  },
});

export const orgDropdownDivider = style({
  height: "1px",
  background: vars.color.border,
  margin: `${vars.space["1"]} 0`,
});

export const orgDropdownCreateBtn = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.primary,
  fontWeight: vars.font.weight.medium,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.selectedBg },
  },
});

export const checkMark = style({
  width: vars.space["3"],
  fontSize: vars.font.size.xs,
  color: vars.color.primary,
  textAlign: "center",
  flexShrink: 0,
});

export const orgBadgeSmall = style({
  width: "22px",
  height: "22px",
  borderRadius: vars.radius.org,
  background: vars.color.selectedBg,
  color: vars.color.primary,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.bold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const orgDropdownName = style({
  fontSize: vars.font.size.sm,
  flex: 1,
});

export const tree = style({
  flex: 1,
  overflowY: "auto",
  padding: "8px 0",
});

export const treeSectionLabel = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.7px",
  textTransform: "uppercase",
  padding: `6px 14px ${vars.space["1"]}`,
});

export const projRowWrapper = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

export const projRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `6px 14px`,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const projRowActive = style({
  background: vars.color.selectedBg,
});

export const projArrow = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  flexShrink: 0,
  width: vars.space["3"],
  textAlign: "center",
});

export const projIcon = style({
  fontSize: vars.font.size.sm,
  flexShrink: 0,
});

export const projName = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "left",
});

export const projDeleteBtn = style({
  position: "absolute",
  right: vars.space["3"],
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textDisabled,
  fontSize: vars.font.size.md,
  lineHeight: 1,
  padding: "2px 4px",
  borderRadius: vars.radius.sm,
  opacity: 0,
  transition: "opacity 150ms ease, color 150ms ease",
  flexShrink: 0,
  selectors: {
    "&:hover": { color: vars.color.error },
    [`${projRowWrapper}:hover &`]: { opacity: 1 },
  },
});

export const erdRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["1"]} 14px ${vars.space["1"]} 34px`,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const erdDot = style({
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  background: vars.color.borderStrong,
  flexShrink: 0,
});

export const erdName = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  flex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
});

export const erdBadge = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.semibold,
  padding: "1px 4px",
  borderRadius: "3px",
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  flexShrink: 0,
});

export const erdNewBtn = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["1"]} 14px ${vars.space["1"]} 34px`,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: vars.font.family,
  width: "100%",
  textAlign: "left",
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  fontWeight: vars.font.weight.medium,
  selectors: {
    "&:hover": { color: vars.color.primary },
  },
});

export const sidebarFooter = style({
  padding: "10px 14px",
  borderTop: `1px solid ${vars.color.border}`,
});

export const addProjectBtn = style({
  padding: "5px 10px",
  border: `1.5px dashed ${vars.color.borderStrong}`,
  borderRadius: vars.radius.md,
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  textAlign: "center",
  cursor: "pointer",
  background: "none",
  fontFamily: vars.font.family,
  width: "100%",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      color: vars.color.primary,
      background: vars.color.selectedBg,
    },
  },
});

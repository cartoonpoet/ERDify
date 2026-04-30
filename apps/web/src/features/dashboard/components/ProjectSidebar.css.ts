import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const sidebar = style({
  width: "220px",
  background: vars.color.surface,
  borderRight: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
});

export const sidebarHeader = style({
  padding: `${vars.space["4"]} ${vars.space["4"]} ${vars.space["2"]}`,
  borderBottom: `1px solid ${vars.color.surfaceSecondary}`,
});

export const orgName = style({
  fontSize: "13px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  marginBottom: "2px",
});

export const sectionLabel = style({
  padding: `${vars.space["3"]} ${vars.space["4"]} ${vars.space["1"]}`,
  fontSize: "10px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
});

export const projectItemWrapper = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

export const projectItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `7px ${vars.space["4"]}`,
  fontSize: "13px",
  color: vars.color.textSecondary,
  cursor: "pointer",
  background: "none",
  border: "none",
  width: "100%",
  textAlign: "left",
  fontFamily: vars.font.family,
  position: "relative",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const projectDeleteBtn = style({
  position: "absolute",
  right: vars.space["3"],
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textDisabled,
  fontSize: "14px",
  lineHeight: 1,
  padding: "2px 4px",
  borderRadius: vars.radius.sm,
  opacity: 0,
  transition: "opacity 150ms ease, color 150ms ease",
  flexShrink: 0,
  selectors: {
    "&:hover": { color: vars.color.error },
    [`${projectItemWrapper}:hover &`]: { opacity: 1 },
  },
});

export const projectItemActive = style({
  background: vars.color.selectedBg,
  color: vars.color.primary,
  fontWeight: "600",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: "3px",
      background: vars.color.primary,
      borderRadius: "0 2px 2px 0",
    },
  },
});

export const dot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "currentColor",
  opacity: 0.5,
  flexShrink: 0,
});

export const addProjectBtn = style({
  margin: `${vars.space["2"]} ${vars.space["3"]}`,
  padding: `7px ${vars.space["3"]}`,
  borderRadius: vars.radius.md,
  border: `1.5px dashed ${vars.color.borderStrong}`,
  background: "transparent",
  color: vars.color.textSecondary,
  fontSize: "12px",
  fontFamily: vars.font.family,
  cursor: "pointer",
  textAlign: "center",
  selectors: {
    "&:hover": { borderColor: vars.color.primary, color: vars.color.primary },
  },
});

export const scrollArea = style({
  overflowY: "auto",
  flex: 1,
});

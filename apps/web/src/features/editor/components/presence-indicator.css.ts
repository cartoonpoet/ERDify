import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

const fadeIn = keyframes({
  from: { opacity: 0, transform: "translateY(4px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

export const list = style({
  display: "flex",
  gap: vars.space["1"],
  alignItems: "center",
});

export const avatarWrapper = style({
  position: "relative",
});

export const avatar = style({
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.color.surface,
  fontSize: "12px",
  fontWeight: "600",
  cursor: "default",
  flexShrink: 0,
  userSelect: "none",
});

export const tooltip = style({
  position: "absolute",
  top: "calc(100% + 8px)",
  left: "50%",
  transform: "translateX(-50%)",
  background: vars.color.textPrimary,
  color: vars.color.surface,
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  opacity: 0,
  zIndex: 100,
  boxShadow: vars.shadow.md,
  animation: `${fadeIn} 150ms ease`,
  transition: "opacity 150ms ease",
  selectors: {
    [`${avatarWrapper}:hover &`]: {
      opacity: 1,
      pointerEvents: "auto",
    },
    "&::before": {
      content: '""',
      position: "absolute",
      bottom: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      borderWidth: "5px",
      borderStyle: "solid",
      borderColor: `transparent transparent ${vars.color.textPrimary} transparent`,
    },
  },
});

export const tooltipName = style({
  fontSize: "13px",
  fontWeight: "600",
  fontFamily: vars.font.family,
});

export const tooltipEntity = style({
  fontSize: "11px",
  color: vars.color.textDisabled,
  marginTop: "2px",
  fontFamily: vars.font.family,
});

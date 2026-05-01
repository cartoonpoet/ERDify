import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
});

export const tabs = style({
  display: "flex",
  gap: vars.space["1"],
  borderBottom: `1px solid ${vars.color.border}`,
  marginBottom: vars.space["2"],
});

export const tab = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  border: "none",
  background: "none",
  fontSize: "13px",
  fontWeight: "500",
  color: vars.color.textSecondary,
  cursor: "pointer",
  fontFamily: vars.font.family,
  borderBottom: "2px solid transparent",
  marginBottom: "-1px",
  transition: "color 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover": { color: vars.color.textPrimary },
  },
});

export const tabActive = style({
  color: vars.color.primary,
  borderBottomColor: vars.color.primary,
});

export const avatarRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
});

export const avatarClickable = style({
  position: "relative",
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  border: "none",
  padding: 0,
  cursor: "pointer",
  flexShrink: 0,
  overflow: "hidden",
  background: "none",
  selectors: {
    "&:hover > *:last-child": { opacity: 1 },
  },
});

export const avatarPreview = style({
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  objectFit: "cover",
  display: "block",
});

export const avatarFallback = style({
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: vars.color.primary,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  fontWeight: "700",
  userSelect: "none",
});

export const avatarOverlay = style({
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.45)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "600",
  opacity: 0,
  transition: "opacity 150ms ease",
});

export const avatarHint = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  lineHeight: "1.4",
});

export const successMsg = style({
  fontSize: "13px",
  color: "#15803d",
  background: "#dcfce7",
  border: "1px solid #86efac",
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  margin: 0,
});

export const errorMsg = style({
  fontSize: "13px",
  color: "#b91c1c",
  background: "#fee2e2",
  border: "1px solid #fca5a5",
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  margin: 0,
});

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
  gap: vars.space["4"],
});

export const avatarPreview = style({
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  objectFit: "cover",
  border: `2px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const avatarFallback = style({
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  background: vars.color.primary,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  fontWeight: "700",
  flexShrink: 0,
  userSelect: "none",
});

export const avatarUrlInput = style({
  flex: 1,
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

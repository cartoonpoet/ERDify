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

/* ── 아바타 + 업로드 존 ── */

export const avatarSection = style({
  display: "grid",
  gridTemplateColumns: "72px 1fr",
  gap: vars.space["3"],
  alignItems: "center",
});

export const avatarCircle = style({
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  overflow: "hidden",
  background: vars.color.primary,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const avatarImg = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
});

export const avatarInitial = style({
  fontSize: "28px",
  fontWeight: "700",
  color: "#fff",
  userSelect: "none",
  lineHeight: 1,
});

export const dropZone = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  border: `1.5px dashed ${vars.color.border}`,
  borderRadius: vars.radius.md,
  cursor: "pointer",
  transition: "border-color 150ms ease, background 150ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: `${vars.color.primary}08`,
    },
  },
});

export const dropZoneActive = style({
  borderColor: vars.color.primary,
  background: `${vars.color.primary}10`,
});

export const dropIcon = style({
  width: "22px",
  height: "22px",
  color: vars.color.textSecondary,
  marginBottom: "2px",
});

export const dropLabel = style({
  fontSize: "13px",
  fontWeight: "500",
  color: vars.color.textPrimary,
});

export const dropHint = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
});

export const fileSelected = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["3"]}`,
  border: `1.5px solid #86efac`,
  borderRadius: vars.radius.md,
  background: "#f0fdf4",
});

export const fileSelectedIcon = style({
  fontSize: "14px",
  color: "#16a34a",
  flexShrink: 0,
  fontWeight: "700",
});

export const fileSelectedName = style({
  flex: 1,
  fontSize: "13px",
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const fileClearBtn = style({
  flexShrink: 0,
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  border: "none",
  background: "#bbf7d0",
  color: "#15803d",
  fontSize: "10px",
  fontWeight: "700",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
  selectors: {
    "&:hover": { background: "#86efac" },
  },
});

/* ── 메시지 ── */

export const successMsg = style({
  fontSize: "13px",
  color: "#15803d",
  background: "#f0fdf4",
  border: "1px solid #86efac",
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  margin: 0,
});

export const errorMsg = style({
  fontSize: "13px",
  color: "#b91c1c",
  background: "#fef2f2",
  border: "1px solid #fca5a5",
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  margin: 0,
});

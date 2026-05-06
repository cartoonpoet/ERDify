import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const tabRow = style({
  display: "flex",
  borderBottom: `1px solid ${vars.color.border}`,
  marginBottom: vars.space["4"],
});

export const tab = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: vars.color.textSecondary,
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
  fontWeight: "600",
});

export const nameField = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["1"],
  marginBottom: vars.space["3"],
});

export const fieldLabel = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  letterSpacing: "0.3px",
  textTransform: "uppercase",
});

export const textInput = style({
  height: "36px",
  padding: `0 ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "14px",
  color: vars.color.textPrimary,
  background: vars.color.surface,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.primary}22` },
  },
});

export const sectionHeader = style({
  marginBottom: vars.space["2"],
});

export const sectionTitle = style({
  fontSize: "14px",
  fontWeight: "600",
  color: vars.color.textPrimary,
  marginBottom: "2px",
});

export const sectionDesc = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
});

export const hintBox = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  background: "rgba(0,100,224,0.07)",
  border: "1px solid rgba(0,100,224,0.15)",
  borderRadius: vars.radius.md,
  marginTop: vars.space["3"],
  fontSize: "12px",
  color: vars.color.textSecondary,
  lineHeight: "1.5",
});

export const hintIcon = style({
  color: vars.color.primary,
  fontSize: "14px",
  flexShrink: 0,
  marginTop: "1px",
});

export const dropzone = style({
  border: `2px dashed ${vars.color.borderStrong}`,
  borderRadius: vars.radius.lg,
  padding: vars.space["6"],
  textAlign: "center",
  cursor: "pointer",
  color: vars.color.textSecondary,
  fontSize: "13px",
  transition: "border-color 150ms ease, background 150ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: `${vars.color.primary}08`,
    },
  },
});

export const dropzoneActive = style({
  borderColor: vars.color.primary,
  background: `${vars.color.primary}08`,
});

export const dropzoneIcon = style({
  fontSize: "28px",
  marginBottom: vars.space["2"],
});

export const dropzoneHint = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  marginTop: vars.space["1"],
});

export const fileChosen = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.md,
  fontSize: "13px",
  color: vars.color.textPrimary,
  marginTop: vars.space["2"],
});

export const fileChosenName = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const fileClearBtn = style({
  background: "none",
  border: "none",
  color: vars.color.textSecondary,
  cursor: "pointer",
  fontSize: "16px",
  lineHeight: 1,
  padding: 0,
  selectors: { "&:hover": { color: vars.color.error } },
});

export const errorText = style({
  fontSize: "12px",
  color: vars.color.error,
  marginTop: vars.space["2"],
});

export const footer = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: vars.space["2"],
  marginTop: vars.space["4"],
  paddingTop: vars.space["4"],
  borderTop: `1px solid ${vars.color.border}`,
});

export const cancelBtn = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:hover": { background: vars.color.surfaceSecondary } },
});

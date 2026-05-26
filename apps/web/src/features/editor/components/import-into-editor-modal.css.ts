import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const dialectTabsRow = style({
  display: "flex",
  gap: 4,
  marginBottom: 14,
});

const dialectTabBase = style({
  padding: "4px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
});

export const dialectTabVariants = styleVariants({
  active: [
    dialectTabBase,
    {
      background: vars.color.primary,
      color: "#fff",
      border: `1px solid ${vars.color.primary}`,
      fontWeight: vars.font.weight.semibold,
    },
  ],
  inactive: [
    dialectTabBase,
    {
      background: "none",
      color: "#374151",
      border: `1px solid ${vars.color.border}`,
      fontWeight: vars.font.weight.regular,
    },
  ],
});

export const filePickerSection = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 8,
});

export const pickerTitle = style({
  fontSize: 12,
  fontWeight: vars.font.weight.semibold,
  color: vars.color.textPrimary,
  marginBottom: 2,
});

export const pickerSubtitle = style({
  fontSize: 11,
  color: vars.color.textSecondary,
});

export const pickFileBtn = style({
  padding: "4px 10px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: 6,
  background: vars.color.surfaceSecondary,
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap",
});

export const sqlFilesList = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 8,
  maxHeight: "40vh",
  overflowY: "auto",
});

export const sqlFileItem = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "5px 10px",
  background: vars.color.surfaceTertiary,
  borderRadius: 6,
  border: `1px solid ${vars.color.border}`,
  fontSize: 12,
});

export const sqlFileName = style({
  color: vars.color.textPrimary,
});

export const sqlFileRemoveBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#9CA3AF",
  fontSize: 14,
});

export const hiddenFileInput = style({
  display: "none",
});

export const directInputLabel = style({
  fontSize: 11,
  color: vars.color.textSecondary,
  marginBottom: 4,
});

export const infoBox = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  marginTop: 10,
  padding: "8px 10px",
  background: "#F0F6FF",
  borderRadius: 6,
  fontSize: 11,
  color: vars.color.textPrimary,
});

export const infoIcon = style({
  color: vars.color.primary,
  flexShrink: 0,
});

export const errorText = style({
  color: "#ef4444",
  fontSize: 12,
  marginTop: 8,
});

export const actionsRow = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 16,
});

export const btnBase = style({
  padding: "4px 10px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: 6,
  background: "none",
  cursor: "pointer",
  fontSize: 12,
});

export const cancelBtn = style([
  btnBase,
  {
    padding: "6px 14px",
  },
]);

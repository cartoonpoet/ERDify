import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const headerEditRow = style({
  background: vars.color.primary,
  padding: "5px 8px",
  borderRadius: "4px 4px 0 0",
  display: "flex",
  alignItems: "center",
  gap: 6,
});

export const tableNameInput = style({
  flex: 1,
  background: "rgba(255,255,255,0.15)",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.5)",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 12,
  fontFamily: "monospace",
  outline: "none",
  padding: "1px 2px",
});

export const deleteEntityBtn = style({
  flexShrink: 0,
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.4)",
  borderRadius: 4,
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  padding: "2px 6px",
  whiteSpace: "nowrap",
  selectors: {
    "&:hover": {
      background: vars.color.error,
      borderColor: vars.color.error,
    },
  },
});

export const colHeaderRow = style({
  display: "flex",
  gap: 4,
  padding: "2px 8px",
  background: "#f1f5f9",
  borderBottom: "1px solid #e2e8f0",
});

export const colHeaderLabel = style({
  fontSize: 9,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const editColumnItem = style({
  padding: "3px 8px",
  borderBottom: "1px solid #f1f5f9",
  display: "flex",
  gap: 4,
  alignItems: "center",
});

export const editPkBadge = style({
  width: 20,
  color: "#f59e0b",
  fontWeight: 700,
  fontSize: 9,
  textAlign: "center",
  flexShrink: 0,
});

export const columnNameInput = style({
  flex: 1,
  minWidth: 0,
  fontSize: 11,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 2,
  padding: "1px 3px",
  fontFamily: "monospace",
  color: vars.color.textPrimary,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary },
  },
});

export const typeInput = style({
  width: 88,
  fontSize: 10,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 2,
  padding: "1px 4px",
  color: vars.color.textPrimary,
  background: vars.color.surfaceTertiary,
  fontFamily: "monospace",
  outline: "none",
  height: 20,
  flexShrink: 0,
  selectors: {
    "&:focus": { borderColor: vars.color.primary, background: "#ffffff" },
    "&::placeholder": { color: "#94a3b8" },
  },
});

export const typeDropdown = style({
  position: "absolute",
  top: "calc(100% + 2px)",
  left: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  boxShadow: vars.shadow.lg,
  zIndex: 9999,
  minWidth: 130,
  maxHeight: 200,
  overflowY: "auto",
  padding: "4px 0",
});

export const typeOption = style({
  display: "block",
  width: "100%",
  padding: "5px 10px",
  fontSize: 11,
  fontFamily: "monospace",
  textAlign: "left",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textPrimary,
  selectors: {
    "&:hover": { background: "#eff6ff", color: vars.color.primary },
  },
});

export const typeOptionActive = style({
  color: vars.color.primary,
  fontWeight: 700,
  background: "#eff6ff",
});

export const typeSelectWrapper = style({
  position: "relative",
  flexShrink: 0,
});

export const pkCheckbox = style({
  width: 14,
  height: 14,
  accentColor: vars.color.primary,
  cursor: "pointer",
  flexShrink: 0,
});

export const deleteColBtn = style({
  width: 18,
  height: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: `1px solid transparent`,
  borderRadius: 3,
  color: vars.color.borderStrong,
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
  lineHeight: 1,
  flexShrink: 0,
  selectors: {
    "&:hover": {
      color: vars.color.error,
      background: `${vars.color.error}14`,
      borderColor: `${vars.color.error}40`,
    },
  },
});

export const addColumnBtn = style({
  width: "100%",
  fontSize: 10,
  padding: "3px 0",
  background: vars.color.surfaceTertiary,
  border: `1px dashed ${vars.color.borderStrong}`,
  borderRadius: 3,
  color: vars.color.textSecondary,
  cursor: "pointer",
  fontFamily: "monospace",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const addColumnWrapper = style({
  padding: "4px 8px",
});

export const colorPickerWrapper = style({
  position: "relative",
  flexShrink: 0,
});

export const colorSwatch = style({
  width: 16,
  height: 16,
  borderRadius: 3,
  border: "2px solid rgba(255,255,255,0.5)",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
  selectors: {
    "&:hover": { borderColor: "#ffffff" },
  },
});

export const colorDropdown = style({
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  background: "#1f2937",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  boxShadow: vars.shadow.lg,
  zIndex: 9999,
  padding: 6,
  display: "flex",
  gap: 4,
  flexWrap: "wrap",
  width: 116,
});

export const colorOption = style({
  width: 20,
  height: 20,
  borderRadius: 4,
  border: "2px solid transparent",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
  selectors: {
    "&:hover": { transform: "scale(1.2)" },
  },
});

export const collaboratorDot = style({
  position: "absolute",
  top: -8,
  right: 6,
  width: 12,
  height: 12,
  borderRadius: "50%",
  border: "2px solid #ffffff",
  zIndex: 1,
});

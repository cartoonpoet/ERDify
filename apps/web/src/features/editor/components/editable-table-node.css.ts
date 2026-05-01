import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const nodeView = style({
  background: "#ffffff",
  border: `2px solid ${vars.color.border}`,
  borderRadius: 6,
  minWidth: 180,
  fontFamily: "monospace",
  fontSize: 12,
  boxShadow: vars.shadow.sm,
  position: "relative",
});

export const nodeViewSelected = style({
  border: `2px solid ${vars.color.primary}`,
  boxShadow: `0 4px 20px rgba(0, 100, 224, 0.18)`,
});

export const header = style({
  background: "#374151",
  color: "#ffffff",
  padding: "6px 10px",
  fontWeight: 700,
  borderRadius: "4px 4px 0 0",
  fontSize: 13,
});

export const headerSelected = style({
  background: vars.color.primary,
});

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
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.6)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
  selectors: {
    "&:hover": { color: "#ffffff" },
  },
});

export const columnList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
});

export const columnItem = style({
  padding: "3px 10px",
  borderBottom: "1px solid #f3f4f6",
  display: "flex",
  gap: 8,
  alignItems: "center",
});

export const pkBadge = style({
  color: "#f59e0b",
  fontWeight: 700,
  fontSize: 10,
  minWidth: 16,
});

export const columnName = style({
  flex: 1,
  color: "#111827",
});

export const columnType = style({
  color: "#6b7280",
  fontSize: 10,
});

export const nullableBadge = style({
  color: "#9ca3af",
});

export const emptyHint = style({
  padding: "4px 10px",
  color: "#9ca3af",
  fontStyle: "italic",
});

export const editArea = style({
  padding: 0,
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
});

export const columnNameInput = style({
  flex: 1,
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

export const typeSelect = style({
  width: 82,
  fontSize: 10,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 2,
  padding: "1px 2px",
  color: vars.color.textSecondary,
  background: vars.color.surfaceTertiary,
  fontFamily: "monospace",
  outline: "none",
});

export const pkCheckbox = style({
  width: 14,
  height: 14,
  accentColor: vars.color.primary,
  cursor: "pointer",
});

export const deleteColBtn = style({
  width: 16,
  background: "none",
  border: "none",
  color: vars.color.border,
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
  lineHeight: 1,
  selectors: {
    "&:hover": { color: vars.color.error },
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

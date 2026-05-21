import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

// ─── 공통 래퍼 ───────────────────────────────────────────────
export const tableNodeWrapper = style({
  background: vars.color.surface,
  borderRadius: 6,
  position: "relative",
});

export const tableNodeWrapperReadOnly = style({
  minWidth: 380,
});

export const tableNodeWrapperEdit = style({
  minWidth: 420,
});

// ─── 헤더 (동적 background은 style prop 유지) ────────────────
export const tableNodeHeader = style({
  color: "#ffffff",
  padding: "6px 10px",
  fontWeight: vars.font.weight.bold,
  fontSize: 14,
});

export const tableNodeHeaderComment = style({
  fontSize: vars.font.size.xs,
  fontStyle: "italic",
  fontWeight: vars.font.weight.regular,
  color: "rgba(255,255,255,0.75)",
  marginTop: 1,
});

// ─── 편집 모드 헤더 ──────────────────────────────────────────
export const headerEditRow = style({
  background: vars.color.primary,
  padding: "5px 8px",
  borderRadius: 0,
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
  fontWeight: vars.font.weight.bold,
  fontSize: vars.font.size.md,
  outline: "none",
  padding: "1px 2px",
});

export const tableCommentInput = style({
  flex: 1,
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.3)",
  color: "rgba(255,255,255,0.8)",
  fontSize: vars.font.size.xs,
  outline: "none",
  padding: "1px 2px",
  selectors: {
    "&::placeholder": { color: "rgba(255,255,255,0.4)" },
  },
});

export const deleteEntityBtn = style({
  flexShrink: 0,
  width: 20,
  height: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.15)",
  border: "none",
  borderRadius: "50%",
  color: "rgba(255,255,255,0.75)",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1,
  padding: 0,
  selectors: {
    "&:hover": { background: vars.color.error, color: "#ffffff" },
    "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
  },
});

// ─── 컬럼 헤더 행 ─────────────────────────────────────────────
const colHeaderBase = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  fontWeight: vars.font.weight.semibold,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
});

export const colHeaderRow = style({
  display: "flex",
  gap: 4,
  padding: "2px 8px",
  background: "#f1f5f9",
  borderBottom: "1px solid #e2e8f0",
});

export const colHeaderLabel = style([colHeaderBase]);

// 편집모드 컬럼헤더 셀
export const colHeaderCellFixed = style([colHeaderBase, {
  width: 26,
  flexShrink: 0,
  textAlign: "center",
}]);

export const colHeaderCellFluid = style([colHeaderBase, {
  flex: 1,
}]);

export const colHeaderCellType = style([colHeaderBase, {
  width: 88,
  flexShrink: 0,
}]);

export const colHeaderSpacer = style({
  width: 18,
  flexShrink: 0,
});

// 읽기모드 컬럼헤더 셀
export const roColHeaderRow = style({
  display: "flex",
  alignItems: "center",
  padding: "3px 8px 3px 10px",
  background: "#F8FAFB",
  borderBottom: `1px solid #E5E7EB`,
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  fontWeight: vars.font.weight.bold,
  letterSpacing: ".06em",
  textTransform: "uppercase",
});

export const roColHeaderCellFixed = style({
  width: 24,
  flexShrink: 0,
  textAlign: "center",
});

export const roColHeaderCellFk = style({
  width: 20,
  flexShrink: 0,
  textAlign: "center",
});

export const roColHeaderCellNullable = style({
  width: 28,
  flexShrink: 0,
  textAlign: "center",
});

export const roColHeaderCellFluid = style({
  flex: 1,
});

export const roColHeaderCellWide = style({
  flex: 1.2,
});

export const roColHeaderCellType = style({
  width: 90,
  flexShrink: 0,
});

// ─── 읽기모드 컬럼 리스트 ─────────────────────────────────────
export const roColList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
});

// ─── 읽기모드 컬럼 행 ─────────────────────────────────────────
export const roColRow = style({
  display: "flex",
  alignItems: "center",
  padding: "4px 8px 4px 10px",
  borderBottom: `1px solid #F1F4F7`,
});

export const roBadgeCell = style({
  width: 24,
  flexShrink: 0,
  textAlign: "center",
});

export const roFkCell = style({
  width: 20,
  flexShrink: 0,
  display: "flex",
  justifyContent: "center",
});

export const roNullableCell = style({
  width: 28,
  flexShrink: 0,
  textAlign: "center",
});

export const roPkBadge = style({
  color: "#f59e0b",
  fontWeight: vars.font.weight.bold,
  fontSize: 8,
});

export const roNullableText = style({
  color: "#9ca3af",
  fontSize: vars.font.size.xs,
});

export const roUqBadge = style({
  color: "#6366f1",
  fontSize: 8,
  fontWeight: vars.font.weight.bold,
});

export const roLogicalNameCell = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  fontWeight: vars.font.weight.medium,
});

export const roColumnNameCell = style({
  flex: 1.2,
  minWidth: 0,
  color: vars.color.textPrimary,
  fontWeight: vars.font.weight.medium,
  fontSize: 12,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const roTypeCell = style({
  width: 90,
  flexShrink: 0,
  color: vars.color.textSecondary,
  fontSize: vars.font.size.sm,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const roEmptyColumns = style({
  padding: "4px 10px",
  color: "#9ca3af",
  fontStyle: "italic",
  fontSize: vars.font.size.sm,
});

// ─── 읽기모드 인덱스 ──────────────────────────────────────────
export const roIndexRow = style({
  display: "flex",
  gap: 5,
  alignItems: "center",
  padding: "2px 0",
  fontSize: vars.font.size.sm,
});

export const roIndexBadgeVariants = styleVariants({
  normal: {
    fontSize: 9,
    fontWeight: vars.font.weight.bold,
    flexShrink: 0,
    color: "#6b7280",
    background: "#f3f4f6",
    borderRadius: 3,
    padding: "1px 4px",
  },
  unique: {
    fontSize: 9,
    fontWeight: vars.font.weight.bold,
    flexShrink: 0,
    color: "#6366f1",
    background: "#eef2ff",
    borderRadius: 3,
    padding: "1px 4px",
  },
});

export const roIndexName = style({
  color: vars.color.textPrimary,
});

export const roIndexColNames = style({
  color: vars.color.textSecondary,
  fontSize: vars.font.size.xs,
});

// ─── 편집모드 컬럼 행 ─────────────────────────────────────────
export const editColumnItem = style({
  padding: "3px 8px",
  borderBottom: `1px solid #f1f5f9`,
  display: "flex",
  gap: 4,
  alignItems: "center",
});

export const columnNameInput = style({
  flex: 1,
  minWidth: 0,
  fontSize: 12,
  fontWeight: vars.font.weight.medium,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 2,
  padding: "1px 3px",
  color: vars.color.textPrimary,
  outline: "none",
  width: "100%",
  selectors: {
    "&:focus": { borderColor: vars.color.primary },
  },
});

export const typeInput = style({
  width: 88,
  fontSize: vars.font.size.sm,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 2,
  padding: "1px 4px",
  color: vars.color.textSecondary,
  background: vars.color.surfaceTertiary,
  outline: "none",
  height: 20,
  flexShrink: 0,
  selectors: {
    "&:focus": { borderColor: vars.color.primary, background: "#ffffff" },
    "&::placeholder": { color: "#94a3b8" },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
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
  fontSize: vars.font.size.sm,
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
  fontWeight: vars.font.weight.bold,
  background: "#eff6ff",
});

export const typeSelectWrapper = style({
  position: "relative",
  flexShrink: 0,
});

export const deleteColBtn = style({
  width: 18,
  height: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "1px solid transparent",
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
    "&:focus-visible": {
      outline: `2px solid ${vars.color.error}`,
      outlineOffset: 1,
    },
  },
});

export const addColumnBtn = style({
  width: "100%",
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  padding: "3px 0",
  background: vars.color.surfaceTertiary,
  border: `1px dashed ${vars.color.borderStrong}`,
  borderRadius: 3,
  color: vars.color.textPrimary,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.primary },
  },
});

export const addColumnWrapper = style({
  padding: "4px 8px",
});

// ─── 컬럼명 입력 래퍼 (AI 자동완성 포함) ─────────────────────
export const colNameWrapper = style({
  position: "relative",
  flex: 1,
});

export const suggestionsList = style({
  position: "absolute",
  top: "100%",
  left: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  zIndex: 200,
  margin: 0,
  padding: "4px 0",
  listStyle: "none",
  minWidth: 200,
  boxShadow: vars.shadow.md,
});

export const suggestionItem = style({
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: vars.font.size.md,
  display: "flex",
  gap: 8,
  alignItems: "center",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const suggestionItemType = style({
  color: vars.color.borderStrong,
});

export const suggestionItemPk = style({
  color: vars.color.primary,
  fontSize: vars.font.size.sm,
});

// ─── 기타 셀 ─────────────────────────────────────────────────
export const checkboxCell = style({
  width: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const rowCheckbox = style({
  width: 12,
  height: 12,
  accentColor: vars.color.primary,
  cursor: "pointer",
  margin: 0,
});

export const fkDotCell = style({
  width: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const fkDot = style({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#3b82f6",
  flexShrink: 0,
});

export const logicalNameInput = style({
  flex: 1,
  minWidth: 0,
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  border: "none",
  borderBottom: "1px solid transparent",
  background: "transparent",
  color: vars.color.textSecondary,
  outline: "none",
  padding: "1px 2px",
  selectors: {
    "&:focus": { borderBottomColor: vars.color.primary },
    "&::placeholder": { color: vars.color.borderStrong },
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

// ─── 인덱스 섹션 ──────────────────────────────────────────────
export const indexSection = style({
  borderTop: `1px dashed ${vars.color.border}`,
  padding: "5px 8px 6px",
});

export const indexSectionHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
});

export const indexSectionLabel = style({
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  flex: 1,
});

export const indexAddBtn = style({
  fontSize: vars.font.size.xs,
  color: vars.color.primary,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  selectors: {
    "&:hover": { textDecoration: "underline" },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 2,
      borderRadius: 2,
    },
  },
});

export const indexRow = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 3,
  padding: "2px 4px",
  background: vars.color.surfaceTertiary,
  borderRadius: 3,
  border: `1px solid ${vars.color.border}`,
});

export const indexNameInput = style({
  flex: 1,
  minWidth: 0,
  fontSize: vars.font.size.sm,
  border: "none",
  background: "transparent",
  color: vars.color.textPrimary,
  outline: "none",
  padding: "1px 2px",
});

export const indexColsBtn = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 3,
  padding: "1px 5px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  maxWidth: 100,
  overflow: "hidden",
  textOverflow: "ellipsis",
  selectors: {
    "&:hover": { borderColor: vars.color.primary },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const indexColsDropdown = style({
  position: "absolute",
  top: "calc(100% + 2px)",
  left: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  boxShadow: vars.shadow.lg,
  zIndex: 9999,
  minWidth: 140,
  padding: "4px 0",
});

export const indexColsBackdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 9998,
});

export const indexColOption = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  fontSize: vars.font.size.sm,
  cursor: "pointer",
  color: vars.color.textPrimary,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const indexUniqueToggle = style({
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.bold,
  padding: "1px 5px",
  borderRadius: 3,
  border: `1px solid ${vars.color.border}`,
  background: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  selectors: {
    "&:hover": { borderColor: vars.color.primary, color: vars.color.primary },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const indexUniqueActive = style({
  background: vars.color.primary,
  color: "#fff",
  borderColor: vars.color.primary,
});

export const indexDeleteBtn = style({
  width: 16,
  height: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  color: vars.color.borderStrong,
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
  flexShrink: 0,
  selectors: {
    "&:hover": { color: vars.color.error },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.error}`,
      outlineOffset: 1,
      borderRadius: 2,
    },
  },
});

export const emptyIndexText = style({
  fontSize: vars.font.size["2xs"],
  color: vars.color.borderStrong,
  fontStyle: "italic",
  paddingLeft: 2,
});

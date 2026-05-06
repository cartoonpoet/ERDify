import { style, composeStyles } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const page = style({
  minHeight: "100vh",
  background: vars.color.surfaceTertiary,
  padding: vars.space["7"],
});

export const container = style({
  maxWidth: "900px",
  margin: "0 auto",
});

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["4"],
  marginBottom: vars.space["6"],
});

export const backBtn = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  background: "none",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.textSecondary,
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:hover": { background: vars.color.surfaceSecondary } },
});

export const title = style({
  flex: 1,
  fontSize: "20px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  margin: 0,
});

export const createBtn = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:hover": { background: vars.color.primaryHover } },
});

export const createForm = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space["6"],
  marginBottom: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
});

export const formRow = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const label = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textPrimary,
});

export const optional = style({
  fontWeight: "400",
  color: vars.color.textSecondary,
});

export const input = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "13px",
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.focusRing}` },
  },
});

export const chips = style({
  display: "flex",
  gap: vars.space["2"],
  flexWrap: "wrap",
});

const chipBase = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const chip = composeStyles(chipBase, style({
  border: `1.5px solid ${vars.color.border}`,
  color: vars.color.textSecondary,
  background: vars.color.surface,
  selectors: { "&:hover": { borderColor: vars.color.borderStrong } },
}));

export const chipActive = composeStyles(chipBase, style({
  border: `1.5px solid ${vars.color.primary}`,
  color: vars.color.primary,
  background: vars.color.selectedBg,
  fontWeight: "600",
}));

export const formActions = style({
  display: "flex",
  justifyContent: "flex-end",
});

export const createSubmitBtn = style({
  padding: `${vars.space["2"]} ${vars.space["5"]}`,
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: {
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
    "&:hover:not(:disabled)": { background: vars.color.primaryHover },
  },
});

export const errorMsg = style({
  fontSize: "12px",
  color: vars.color.error,
  margin: 0,
});

export const revealBox = style({
  background: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: vars.radius.lg,
  padding: vars.space["5"],
  marginBottom: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const revealWarning = style({
  fontSize: "13px",
  color: "#92400e",
  margin: 0,
  fontWeight: "500",
});

export const keyBox = style({
  display: "flex",
  gap: vars.space["2"],
  alignItems: "stretch",
});

export const keyText = style({
  flex: 1,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  fontSize: "11px",
  padding: vars.space["2"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.textPrimary,
  wordBreak: "break-all",
  lineHeight: "1.5",
  userSelect: "all",
});

export const copyBtn = style({
  flexShrink: 0,
  padding: `0 ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const copySuccessBtn = style({
  flexShrink: 0,
  padding: `0 ${vars.space["3"]}`,
  border: "1px solid #16a34a",
  borderRadius: vars.radius.md,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const confirmBtn = style({
  alignSelf: "flex-start",
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  background: vars.color.textPrimary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const emptyMsg = style({
  textAlign: "center",
  color: vars.color.textSecondary,
  fontSize: "14px",
  padding: vars.space["8"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  overflow: "hidden",
});

export const th = style({
  textAlign: "left",
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  background: vars.color.surfaceSecondary,
  fontSize: "11px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const tr = style({
  selectors: {
    "&:not(:last-child)": { borderBottom: `1px solid ${vars.color.border}` },
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const td = style({
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  fontSize: "13px",
  color: vars.color.textPrimary,
  verticalAlign: "middle",
});

export const tdMono = style({
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  fontSize: "12px",
  color: vars.color.textPrimary,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  verticalAlign: "middle",
});

export const tdActions = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  verticalAlign: "middle",
});

export const actionsRow = style({
  display: "flex",
  gap: vars.space["2"],
  alignItems: "center",
});

export const badgeActive = style({
  display: "inline-block",
  padding: `2px 8px`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: "#dcfce7",
  color: "#16a34a",
});

export const badgeExpiring = style({
  display: "inline-block",
  padding: `2px 8px`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: "#fef9c3",
  color: "#a16207",
});

export const badgeExpired = style({
  display: "inline-block",
  padding: `2px 8px`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: vars.color.surfaceSecondary,
  color: vars.color.textDisabled,
});

export const actionBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const actionBtnDanger = composeStyles(actionBtn, style({
  selectors: {
    "&:hover": { background: "#fee2e2", color: vars.color.error, borderColor: "#fca5a5" },
  },
}));

export const confirmInline = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  flexWrap: "wrap",
  fontSize: "12px",
  color: vars.color.textSecondary,
});

export const confirmYesBtn = style({
  padding: `2px 8px`,
  background: vars.color.error,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:disabled": { opacity: 0.5 } },
});

export const confirmNoBtn = style({
  padding: `2px 8px`,
  background: "none",
  color: vars.color.textSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

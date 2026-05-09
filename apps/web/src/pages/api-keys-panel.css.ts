import { style, composeStyles } from "@vanilla-extract/css";
import { vars } from "../style/tokens.css";

export const page = style({
  padding: vars.space["6"],
  flex: 1,
  overflowY: "auto",
});

export const header = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: vars.space["6"],
});

export const title = style({
  fontSize: vars.font.size.lg,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary,
  margin: 0,
});

export const subtitle = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  marginTop: vars.space["1"],
});

export const sectionLabel = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.7px",
  textTransform: "uppercase",
  marginBottom: vars.space["2"],
});

export const card = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  overflow: "hidden",
  boxShadow: vars.shadow.sm,
});

export const keyRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.surfaceSecondary}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const keyName = style({
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const keyMeta = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
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
  flexShrink: 0,
  selectors: { "&:hover": { background: vars.color.primaryHover } },
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

export const badgeActive = style({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: "#dcfce7",
  color: "#16a34a",
  flexShrink: 0,
});

export const badgeExpiring = style({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: "#fef9c3",
  color: "#a16207",
  flexShrink: 0,
});

export const badgeExpired = style({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: vars.color.surfaceSecondary,
  color: vars.color.textDisabled,
  flexShrink: 0,
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

export const actionBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  flexShrink: 0,
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
  padding: "2px 8px",
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
  padding: "2px 8px",
  background: "none",
  color: vars.color.textSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

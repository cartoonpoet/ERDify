// apps/web/src/features/admin/admin.css.ts
import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const page = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
  background: vars.color.surfaceTertiary,
});

export const header = style({
  padding: `${vars.space["5"]} ${vars.space["6"]} ${vars.space["4"]}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const pageTitle = style({
  fontSize: "16px",
  fontWeight: "700",
  color: vars.color.textPrimary,
});

export const statsRow = style({
  display: "flex",
  gap: vars.space["2"],
});

export const statChip = style({
  padding: `3px ${vars.space["3"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  border: `1px solid ${vars.color.border}`,
  color: vars.color.textSecondary,
});

export const statChipCritical = style([statChip, {
  borderColor: "#3a2020",
  color: "#e05252",
  background: "#2a1a1a",
}]);

export const tabRow = style({
  display: "flex",
  gap: vars.space["3"],
  padding: `${vars.space["3"]} ${vars.space["6"]}`,
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
  alignItems: "center",
  flexShrink: 0,
});

export const tab = style({
  padding: `3px ${vars.space["3"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  cursor: "pointer",
  border: "none",
  fontFamily: vars.font.family,
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
});

export const tabActive = style([tab, {
  background: vars.color.textPrimary,
  color: "#fff",
}]);

export const list = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const errorRow = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const errorRowBorderVariants = styleVariants({
  "5xx":    { borderLeftWidth: "3px", borderLeftColor: "#e05252" },
  network:  { borderLeftWidth: "3px", borderLeftColor: "#e8a838" },
  "403":    { borderLeftWidth: "3px", borderLeftColor: "#4a4a7a" },
  "404":    { borderLeftWidth: "3px", borderLeftColor: "#3a3a5a" },
});

export const typeBadge = style({
  padding: `2px ${vars.space["2"]}`,
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  fontWeight: "700",
  flexShrink: 0,
});

export const typeBadgeVariants = styleVariants({
  "5xx":   { background: "#2a1a1a", color: "#e05252" },
  network: { background: "#2a1814", color: "#e8a838" },
  "403":   { background: "#1e1e2e", color: "#8888cc" },
  "404":   { background: "#1e1e2e", color: "#6666aa" },
});

export const rowMeta = style({ flex: 1, minWidth: 0 });

export const rowPath = style({
  fontSize: "13px",
  color: vars.color.textPrimary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const rowTime = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  marginTop: "2px",
});

export const countBadge = style({
  padding: `1px ${vars.space["2"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "700",
  background: "#e05252",
  color: "#fff",
  flexShrink: 0,
});

export const countBadgeMuted = style([countBadge, {
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
}]);

export const resolveBtn = style({
  padding: `3px ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "11px",
  cursor: "pointer",
  flexShrink: 0,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const spikeBanner = style({
  background: "#1a1400",
  border: `1px solid #3a2800`,
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  fontSize: "12px",
  color: "#e8a838",
  marginBottom: vars.space["2"],
});

// Slide-over
export const slideOverBackdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  justifyContent: "flex-end",
});

export const slideOver = style({
  width: "400px",
  background: vars.color.surface,
  borderLeft: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  boxShadow: "-4px 0 16px rgba(0,0,0,0.3)",
});

export const slideOverHeader = style({
  padding: `${vars.space["4"]} ${vars.space["5"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const slideOverTitle = style({
  fontSize: "14px",
  fontWeight: "700",
  color: vars.color.textPrimary,
});

export const slideOverClose = style({
  background: "none",
  border: "none",
  color: vars.color.textSecondary,
  fontSize: "18px",
  cursor: "pointer",
  padding: 0,
});

export const slideOverBody = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space["5"],
});

export const detailGrid = style({
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.md,
  padding: vars.space["4"],
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: "12px",
  marginBottom: vars.space["4"],
});

export const detailLabel = style({ color: vars.color.textSecondary });
export const detailValue = style({ color: vars.color.textPrimary });

export const noteLabel = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  marginBottom: vars.space["2"],
});

export const noteTextarea = style({
  width: "100%",
  minHeight: "80px",
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: vars.space["3"],
  color: vars.color.textPrimary,
  fontSize: "12px",
  fontFamily: vars.font.family,
  resize: "vertical",
  boxSizing: "border-box",
});

export const slideOverFooter = style({
  padding: vars.space["4"],
  borderTop: `1px solid ${vars.color.border}`,
});

export const resolveConfirmBtn = style({
  width: "100%",
  padding: vars.space["3"],
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  selectors: {
    "&:hover": { opacity: 0.9 },
  },
});

export const resolveHint = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  textAlign: "center",
  marginTop: vars.space["2"],
});

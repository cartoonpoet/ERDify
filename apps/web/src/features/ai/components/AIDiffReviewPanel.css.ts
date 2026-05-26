import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const slideUp = keyframes({
  from: { opacity: 0, transform: "translateY(20px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

export const overlay = style({
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  animation: `${fadeIn} 150ms ease`,
  padding: vars.space["5"],
});

export const panel = style({
  background: vars.color.surface,
  borderRadius: vars.radius.xl,
  boxShadow: vars.shadow.xl,
  width: "100%",
  maxWidth: "860px",
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  animation: `${slideUp} 180ms ease`,
  overflow: "hidden",
});

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  padding: `${vars.space["4"]} ${vars.space["5"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const headerTitle = style({
  fontSize: vars.font.size.lg,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary,
  flex: 1,
});

export const headerBadge = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.pill,
  padding: `2px ${vars.space["3"]}`,
  fontWeight: vars.font.weight.medium,
});

export const rejectBtn = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.medium,
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const acceptBtn = style({
  padding: `${vars.space["2"]} ${vars.space["5"]}`,
  borderRadius: vars.radius.md,
  border: "none",
  background: vars.color.primary,
  color: "#fff",
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.semibold,
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: vars.color.primaryHover },
  },
});

export const body = style({
  overflowY: "auto",
  padding: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
});

export const sectionTitle = style({
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  marginBottom: vars.space["2"],
});

export const tablesGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: vars.space["3"],
});

export const tableCard = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  overflow: "hidden",
  background: vars.color.surface,
});

export const tableCardAdded = style({
  borderColor: "#86efac",
  background: "#f0fdf4",
});

export const tableCardRemoved = style({
  borderColor: "#fca5a5",
  background: "#fef2f2",
});

export const tableCardModified = style({
  borderColor: "#fcd34d",
  background: "#fffbeb",
});

export const tableHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  background: vars.color.primary,
  color: "#fff",
});

export const tableHeaderAdded = style({
  background: "#16a34a",
});

export const tableHeaderRemoved = style({
  background: "#dc2626",
});

export const tableHeaderModified = style({
  background: "#d97706",
});

export const tableName = style({
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.semibold,
});

export const tableChangeBadge = style({
  fontSize: vars.font.size.xs,
  background: "rgba(255,255,255,0.25)",
  borderRadius: vars.radius.pill,
  padding: `1px ${vars.space["2"]}`,
});

export const columnList = style({
  padding: `${vars.space["1"]} 0`,
});

export const columnRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `3px ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
});

export const columnRowAdded = style({
  background: "#dcfce7",
  color: "#15803d",
});

export const columnRowRemoved = style({
  background: "#fee2e2",
  color: "#b91c1c",
  textDecoration: "line-through",
});

export const columnRowModified = style({
  background: "#fef9c3",
  color: "#92400e",
});

export const columnChangeMarker = style({
  fontWeight: vars.font.weight.bold,
  fontSize: vars.font.size.md,
  width: "12px",
  flexShrink: 0,
});

export const columnName = style({
  flex: 1,
  fontWeight: vars.font.weight.medium,
});

export const columnType = style({
  color: "inherit",
  opacity: 0.7,
  fontSize: vars.font.size.xs,
});

export const pkBadge = style({
  fontSize: "9px",
  background: "rgba(0,0,0,0.12)",
  borderRadius: "3px",
  padding: "0 4px",
  fontWeight: vars.font.weight.bold,
  letterSpacing: "0.3px",
});

export const relationsSection = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const relationRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  fontSize: vars.font.size.md,
});

export const relationRowAdded = style({
  background: "#dcfce7",
  color: "#15803d",
});

export const relationRowRemoved = style({
  background: "#fee2e2",
  color: "#b91c1c",
});

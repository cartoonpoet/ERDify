import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const mainArea = style({
  background: vars.color.surfaceTertiary,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flex: 1,
});

export const mainHeader = style({
  padding: `${vars.space["5"]} ${vars.space["6"]} ${vars.space["4"]}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const mainTitle = style({
  fontSize: "16px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  letterSpacing: "-0.3px",
  flex: 1,
});

export const filterRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["6"]}`,
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const filterChip = style({
  padding: `4px ${vars.space["3"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  border: "none",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
});

export const filterChipVariants = styleVariants({
  active: { background: vars.color.textPrimary, color: "#fff" },
  inactive: {
    background: vars.color.surfaceSecondary,
    color: vars.color.textSecondary,
    selectors: { "&:hover": { background: vars.color.border } },
  },
});

export const grid = style({
  padding: vars.space["5"],
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: vars.space["3"],
  overflowY: "auto",
  flex: 1,
});

export const diagramCardWrapper = style({
  position: "relative",
});

export const diagramCard = style({
  background: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflow: "hidden",
  cursor: "pointer",
  textDecoration: "none",
  display: "block",
  transition: "box-shadow 200ms ease, transform 200ms ease",
  color: "inherit",
  selectors: {
    "&:hover": {
      boxShadow: vars.shadow.md,
      transform: "translateY(-2px)",
    },
  },
});

export const ctxBtn = style({
  position: "absolute",
  top: vars.space["2"],
  right: vars.space["2"],
  width: "24px",
  height: "24px",
  borderRadius: vars.radius.sm,
  background: "rgba(0,0,0,0.45)",
  color: "#fff",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  opacity: 0,
  transition: "opacity 150ms ease",
  padding: 0,
  zIndex: 1,
  selectors: {
    [`${diagramCardWrapper}:hover &`]: { opacity: 1 },
    [`${diagramCardWrapper}:focus-within &`]: { opacity: 1 },
  },
});

export const ctxMenu = style({
  position: "absolute",
  top: "34px",
  right: vars.space["2"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.md,
  zIndex: 20,
  overflow: "hidden",
  minWidth: "130px",
});

export const ctxItem = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: `9px 14px`,
  fontSize: "12px",
  color: vars.color.primary,
  fontWeight: "600",
  cursor: "pointer",
  background: "none",
  border: "none",
  width: "100%",
  textAlign: "left",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const ctxItemDanger = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: `9px 14px`,
  fontSize: "12px",
  color: vars.color.error,
  cursor: "pointer",
  background: "none",
  border: "none",
  width: "100%",
  textAlign: "left",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: "rgba(239, 68, 68, 0.06)" },
  },
});

export const ctxDivider = style({
  height: "1px",
  background: vars.color.border,
});

export const cardPreview = style({
  height: "90px",
  background: vars.color.surfaceSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["2"],
});

export const miniTable = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "4px",
  padding: "5px 7px",
  fontSize: "8px",
  color: vars.color.textPrimary,
  minWidth: "52px",
});

export const miniTableHeader = style({
  background: vars.color.primary,
  color: "#fff",
  margin: "-5px -7px 4px",
  padding: "3px 7px",
  fontWeight: "600",
  borderRadius: "4px 4px 0 0",
  fontSize: "8px",
});

export const miniField = style({
  color: vars.color.textSecondary,
  marginTop: "2px",
});

export const cardBody = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
});

export const cardName = style({
  fontSize: "13px",
  fontWeight: "600",
  color: vars.color.textPrimary,
  marginBottom: "3px",
});

export const cardMeta = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  display: "flex",
  alignItems: "center",
  gap: vars.space["1"],
});

export const dialectBadge = style({
  background: vars.color.surfaceSecondary,
  borderRadius: "4px",
  padding: "1px 5px",
  fontSize: "10px",
  color: vars.color.textSecondary,
});

export const newCard = style({
  border: `1.5px dashed ${vars.color.borderStrong}`,
  borderRadius: vars.radius.lg,
  background: "transparent",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["2"],
  color: vars.color.textSecondary,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "border-color 200ms ease, color 200ms ease, background 200ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      color: vars.color.primary,
      background: vars.color.surfaceSecondary,
    },
  },
});

export const newCardIcon = style({
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  border: `1.5px solid currentColor`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  lineHeight: 1,
  transition: "transform 200ms ease",
  selectors: {
    [`${newCard}:hover &`]: { transform: "scale(1.1)" },
  },
});

export const emptyState = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  gap: vars.space["3"],
  color: vars.color.textSecondary,
  fontSize: "14px",
});

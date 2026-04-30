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

export const cardDeleteBtn = style({
  position: "absolute",
  top: vars.space["2"],
  right: vars.space["2"],
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  background: vars.color.error,
  color: vars.color.surface,
  border: `1.5px solid ${vars.color.surface}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
  opacity: 0,
  transition: "opacity 150ms ease",
  lineHeight: 1,
  padding: 0,
  zIndex: 1,
  selectors: {
    [`${diagramCardWrapper}:hover &`]: { opacity: 1 },
  },
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
  gap: vars.space["1"],
  minHeight: "60px",
  color: vars.color.textSecondary,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "border-color 150ms ease, color 150ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      color: vars.color.primary,
    },
  },
});

export const newCardIcon = style({
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: vars.color.surfaceSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
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

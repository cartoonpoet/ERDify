import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

// 1. Container — width/minWidth differ by state → styleVariants
const containerBase = style({
  background: vars.color.surface,
  borderRight: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  transition: "width .18s ease, min-width .18s ease",
  overflow: "hidden",
  position: "relative",
  flexShrink: 0,
});

export const containerVariants = styleVariants({
  expanded: [containerBase, { width: 196, minWidth: 196 }],
  collapsed: [containerBase, { width: 40, minWidth: 40 }],
});

// 2. Toggle button — all static
export const toggleButton = style({
  position: "absolute",
  top: 8,
  right: 6,
  width: 24,
  height: 24,
  borderRadius: 6,
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
  zIndex: 10,
  flexShrink: 0,
});

// 3. Expanded content wrapper — all static
export const expandedContent = style({
  padding: "40px 10px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 3,
  flex: 1,
  overflow: "hidden",
});

// 4. Section title — all static
export const sectionTitle = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  padding: "0 4px",
  marginBottom: 2,
});

// 5. Divider — all static
export const divider = style({
  height: 1,
  background: vars.color.border,
  margin: "3px 0",
});

// 6. Collapsed dot strip wrapper — all static
export const collapsedStrip = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "40px 0 8px",
  gap: 2,
});

// 7. Collapsed schema button — opacity is dynamic → keep style prop; other props static
export const collapsedSchemaButton = style({
  width: 28,
  height: 28,
  borderRadius: 7,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  padding: 0,
});

// 8. Color dot in collapsed button — background is dynamic → keep style prop
export const collapsedDot = style({
  width: 10,
  height: 10,
  borderRadius: "50%",
});

// 9. ColorableFilterRow container — all static
export const filterRowContainer = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "5px 4px",
  borderRadius: 6,
});

// 10. Checkbox div — border and background use CSS custom properties
export const filterCheckbox = style({
  vars: {
    "--schema-color": "transparent",
    "--schema-bg": "transparent",
  },
  width: 13,
  height: 13,
  borderRadius: 3,
  border: "1.5px solid var(--schema-color)",
  background: "var(--schema-bg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  cursor: "pointer",
});

// 11. Check mark span — all static
export const checkMark = style({
  color: "#fff",
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  lineHeight: 1,
});

// 12. Color picker dot — background is dynamic; outline/transition are static
export const colorPickerDot = style({
  width: 7,
  height: 7,
  borderRadius: "50%",
  flexShrink: 0,
  cursor: "pointer",
  outline: "2px solid transparent",
  transition: "outline-color .12s",
});

// 13. Hidden color input — all static
export const hiddenColorInput = style({
  position: "absolute",
  opacity: 0,
  pointerEvents: "none",
  width: 0,
  height: 0,
});

// 14. Label span — all static (fontSize 12 is not a token, use literal)
export const filterLabel = style({
  fontSize: 12,
  color: vars.color.textPrimary,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  cursor: "pointer",
});

// 15. Count span — all static
export const filterCount = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
});

// 16. FilterRow container — cursor and opacity depend on dimmed → styleVariants
const filterRowBase = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "5px 4px",
  borderRadius: 6,
});

export const filterRowVariants = styleVariants({
  normal: [filterRowBase, { cursor: "pointer", opacity: 1 }],
  dimmed: [filterRowBase, { cursor: "default", opacity: 0.45 }],
});

// 17. FilterRow checkbox — same dynamic color approach as filterCheckbox
export const filterRowCheckbox = style({
  vars: {
    "--schema-color": "transparent",
    "--schema-bg": "transparent",
  },
  width: 13,
  height: 13,
  borderRadius: 3,
  border: "1.5px solid var(--schema-color)",
  background: "var(--schema-bg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

// 18. FilterRow color dot — background is dynamic; size/shape are static
export const filterRowDot = style({
  width: 7,
  height: 7,
  borderRadius: "50%",
  flexShrink: 0,
});

// 19. FilterRow label — same as filterLabel but no cursor
export const filterRowLabel = style({
  fontSize: 12,
  color: vars.color.textPrimary,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

// FilterRow count — same as filterCount
export const filterRowCount = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textSecondary,
});

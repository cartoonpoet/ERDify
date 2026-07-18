import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const slideUp = keyframes({
  from: { opacity: 0, transform: "translate(-50%, calc(-50% + 12px))" },
  to: { opacity: 1, transform: "translate(-50%, -50%)" },
});

export const backdrop = style({
  position: "fixed",
  inset: 0,
  background: "rgba(10, 20, 40, 0.5)",
  backdropFilter: "blur(2px)",
  zIndex: 2000,
  animation: `${fadeIn} 180ms ease`,
});

// <dialog>로 렌더링되므로(S6819) 기본 UA margin을 리셋한다 (position/border는 이미 명시돼 있음).
export const panel = style({
  margin: 0,
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 2001,
  width: "min(900px, 90vw)",
  maxHeight: "70vh",
  background: vars.color.surface,
  border: `2px solid ${vars.color.primary}`,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.xl,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  animation: `${slideUp} 220ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
});

export const panelHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  background: vars.color.primary,
  color: "#fff",
  flexShrink: 0,
  fontFamily: "monospace",
});

export const panelTitle = style({
  fontWeight: 700,
  fontSize: 13,
  flex: 1,
});

export const panelBadge = style({
  fontSize: 9,
  background: "rgba(255,255,255,0.2)",
  padding: "2px 8px",
  borderRadius: 10,
  fontWeight: 400,
  fontFamily: vars.font.family,
});

export const panelCloseBtn = style({
  background: "rgba(255,255,255,0.15)",
  border: "none",
  color: "#fff",
  width: 22,
  height: 22,
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  flexShrink: 0,
  selectors: {
    "&:hover": { background: "rgba(220, 38, 38, 0.7)" },
  },
});

export const colHeaderRow = style({
  display: "flex",
  alignItems: "center",
  background: vars.color.surfaceTertiary,
  borderBottom: `2px solid ${vars.color.border}`,
  position: "sticky",
  top: 0,
  zIndex: 1,
  flexShrink: 0,
});

export const rowNumHeader = style({
  width: 36,
  flexShrink: 0,
  fontSize: 9,
  color: vars.color.textSecondary,
  textAlign: "center",
  padding: "5px 0",
  borderRight: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceSecondary,
});

export const colHeader = style({
  flex: 1,
  minWidth: 80,
  fontSize: 10,
  fontWeight: 700,
  color: vars.color.textSecondary,
  padding: "5px 8px",
  borderLeft: `1px solid ${vars.color.border}`,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: "monospace",
});

export const colHeaderDeletePlaceholder = style({ width: 28, flexShrink: 0 });

export const scrollArea = style({
  flex: 1,
  overflow: "auto",
  minHeight: 0,
});

export const virtualContainer = style({ position: "relative", width: "100%" });

export const gridRow = style({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  display: "flex",
  alignItems: "center",
  borderBottom: `1px solid ${vars.color.border}`,
  selectors: {
    "&:nth-child(even)": { background: vars.color.surfaceTertiary },
    "&:hover": { background: vars.color.selectedBg },
  },
});

export const rowNum = style({
  width: 36,
  flexShrink: 0,
  fontSize: 10,
  color: vars.color.textSecondary,
  textAlign: "center",
  background: vars.color.surfaceSecondary,
  alignSelf: "stretch",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRight: `1px solid ${vars.color.border}`,
});

export const cell = style({
  flex: 1,
  minWidth: 80,
  border: "none",
  borderLeft: `1px solid ${vars.color.border}`,
  fontSize: 11,
  fontFamily: "monospace",
  padding: "4px 8px",
  outline: "none",
  background: "transparent",
  color: vars.color.textPrimary,
  height: 28,
  selectors: {
    "&:focus": {
      background: vars.color.selectedBg,
      boxShadow: `inset 0 0 0 2px ${vars.color.primary}`,
      position: "relative",
      zIndex: 1,
    },
    "&::placeholder": { color: vars.color.textDisabled, fontStyle: "italic" },
  },
});

export const rowDeleteBtn = style({
  width: 28,
  flexShrink: 0,
  background: "none",
  border: "none",
  color: vars.color.textDisabled,
  cursor: "pointer",
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "stretch",
  selectors: {
    "&:hover": { color: vars.color.error, background: "rgba(228,30,63,0.06)" },
  },
});

export const panelFooter = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderTop: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceTertiary,
  flexShrink: 0,
  fontFamily: "monospace",
});

export const addRowBtn = style({
  fontSize: 11,
  color: vars.color.primary,
  background: "none",
  border: `1px dashed ${vars.color.primary}`,
  borderRadius: vars.radius.sm,
  padding: "3px 12px",
  cursor: "pointer",
  fontFamily: "monospace",
  selectors: { "&:hover": { background: vars.color.selectedBg } },
});

export const rowCount = style({
  fontSize: 11,
  color: vars.color.textSecondary,
  marginLeft: "auto",
});

export const kbdHint = style({
  fontSize: 10,
  color: vars.color.textDisabled,
});

export const doneBtn = style({
  fontSize: 11,
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.sm,
  padding: "4px 16px",
  cursor: "pointer",
  fontFamily: "monospace",
  selectors: { "&:hover": { background: vars.color.primaryHover } },
});

export const seedBadge = style({
  fontSize: 9,
  background: vars.color.selectedBg,
  color: vars.color.primary,
  borderRadius: 10,
  padding: "0 5px",
  fontWeight: 700,
  fontFamily: vars.font.family,
});

export const seedEditBtn = style({
  fontSize: 9,
  color: vars.color.primary,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "monospace",
  padding: 0,
  selectors: { "&:hover": { textDecoration: "underline" } },
});

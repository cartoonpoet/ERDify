import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

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
  // 남는 세로 공간을 채워야(내용 높이로 줄어들지 않아야) 카드 메뉴(absolute)가
  // 펼쳐질 때 scrollHeight가 커지며 스크롤바가 생기는 문제를 막는다.
  flex: 1,
  minHeight: 0,
});

export const diagramCardWrapper = style({
  position: "relative",
  alignSelf: "start",
});

export const diagramCard = style({
  background: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflow: "hidden",
  cursor: "pointer",
  textDecoration: "none",
  display: "block",
  transition: "box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease",
  color: "inherit",
  selectors: {
    "&:hover": {
      boxShadow: vars.shadow.md,
      transform: "translateY(-3px)",
      borderColor: vars.color.primary,
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

// 부가 액션(공유·이동·복사) — 중립(secondary) 색.
export const ctxItem = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: `9px 14px`,
  fontSize: "12px",
  color: vars.color.textPrimary,
  fontWeight: "500",
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

// 메인 액션(수정) — primary 강조.
export const ctxItemPrimary = style([
  ctxItem,
  {
    color: vars.color.primary,
    fontWeight: "600",
    selectors: {
      "&:hover": { background: vars.color.selectedBg },
    },
  },
]);

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
  height: "110px",
  background: `radial-gradient(circle, ${vars.color.border} 1px, transparent 1px)`,
  backgroundSize: "16px 16px",
  backgroundColor: vars.color.surfaceSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["2"],
  overflow: "hidden",
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
  background: vars.color.selectedBg,
  color: vars.color.primary,
  borderRadius: vars.radius.sm,
  padding: "1px 6px",
  fontSize: "10px",
  fontWeight: "600",
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
  alignSelf: "start",
  height: "171px",
  transition: "border-color 200ms ease, color 200ms ease, background 200ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      color: vars.color.primary,
      background: vars.color.selectedBg,
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

export const filterRowDisabled = style({
  opacity: 0.4,
  pointerEvents: "none",
});

export const sectionError = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["3"],
  padding: `${vars.space["9"]} ${vars.space["6"]}`,
  flex: 1,
});

export const sectionErrorIcon = style({ fontSize: "32px", lineHeight: 1 });

export const sectionErrorTitle = style({
  fontSize: "15px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  textAlign: "center",
});

export const sectionErrorDesc = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  textAlign: "center",
  maxWidth: "280px",
});

export const sectionErrorBtn = style({
  marginTop: vars.space["1"],
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: "13px",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const sectionErrorGuide = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  textAlign: "center",
  maxWidth: "260px",
  marginTop: vars.space["1"],
});

export const activeUsersRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["1"],
  marginLeft: "auto",
});

export const avatarStack = style({
  display: "flex",
  alignItems: "center",
});

export const avatar = style({
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  border: `2px solid ${vars.color.surface}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.color.surface,
  fontSize: "9px",
  fontWeight: "700",
  flexShrink: 0,
  selectors: {
    "& + &": { marginLeft: "-7px" },
  },
});

export const avatarOverflow = style({
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  border: `2px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
  fontSize: "8px",
  fontWeight: "700",
  flexShrink: 0,
  marginLeft: "-7px",
});

export const activeUsersBadge = style({
  display: "flex",
  alignItems: "center",
  gap: "3px",
});

export const activeDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: vars.color.success,
  flexShrink: 0,
});

export const activeUsersCount = style({
  fontSize: "10px",
  color: vars.color.success,
  fontWeight: "600",
});

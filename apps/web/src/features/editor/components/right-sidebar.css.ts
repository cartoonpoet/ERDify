import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

/* ── 외부 컨테이너: 패널 + 탭바를 가로로 배치 ── */
export const container = style({
  display: "flex",
  flexDirection: "row",
  flexShrink: 0,
  borderLeft: `1px solid ${vars.color.border}`,
});

/* ── 슬라이딩 패널 (탭바 왼쪽) ── */
export const panel = style({
  width: 280,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  background: vars.color.surface,
  borderRight: `1px solid ${vars.color.border}`,
  transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
});

export const panelClosed = style({
  width: 0,
});

export const panelBody = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

/* ── 수직 탭바 (항상 표시, 맨 우측) ── */
export const tabBar = style({
  width: 44,
  flexShrink: 0,
  background: vars.color.surfaceSecondary,
  borderLeft: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: vars.space["2"],
  gap: vars.space["1"],
});

const tabBtnBase = style({
  width: 34,
  height: 38,
  border: "none",
  background: "none",
  color: vars.color.textDisabled,
  cursor: "pointer",
  borderRadius: vars.radius.sm,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  position: "relative",
  fontFamily: vars.font.family,
  transition: "all 150ms ease",
  selectors: {
    "&:hover": {
      background: vars.color.border,
      color: vars.color.textSecondary,
    },
  },
});

export const tabBtn = styleVariants({
  default: [tabBtnBase],
  active: [
    tabBtnBase,
    {
      background: vars.color.selectedBg,
      color: vars.color.primary,
      selectors: {
        "&:hover": {
          background: vars.color.selectedBg,
          color: vars.color.primary,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: 3,
          height: 18,
          background: vars.color.primary,
          borderRadius: "3px 0 0 3px",
        },
      },
    },
  ],
});

export const tabIcon = style({
  fontSize: 14,
  lineHeight: 1,
});

export const tabLabel = style({
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "-0.2px",
  lineHeight: 1,
});

export const tabSep = style({
  width: 20,
  height: 1,
  background: vars.color.border,
  margin: `${vars.space["1"]} 0`,
  flexShrink: 0,
});

/* ── 플레이스홀더 패널 ── */
export const placeholderPanel = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  gap: vars.space["2"],
  color: vars.color.textDisabled,
  fontSize: vars.font.size.md,
  padding: vars.space["4"],
  textAlign: "center",
});

/* 패널 헤더 (검색/기록 탭에서 사용) */
export const panelHeader = style({
  display: "flex",
  alignItems: "center",
  padding: `0 ${vars.space["3"]}`,
  height: 44,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const panelTitle = style({
  fontSize: 13,
  fontWeight: 700,
  color: vars.color.textPrimary,
});

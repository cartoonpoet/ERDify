import { style, keyframes, globalStyle, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

const AI_GRADIENT = "linear-gradient(135deg, #2563eb 0%, #5b21b6 100%)";

// ── keyframes ──────────────────────────────────────────────────────────────

const dotBounce = keyframes({
  "0%, 60%, 100%": { transform: "translateY(0)",   opacity: 0.4 },
  "30%":           { transform: "translateY(-4px)", opacity: 1 },
});

// ── header ─────────────────────────────────────────────────────────────────

export const chatHeader = style({
  padding: `14px ${vars.space["4"]}`,
  background: AI_GRADIENT,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
});

export const chatHeaderLeft = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
});

export const chatHeaderIcon = style({
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
});

export const chatHeaderTitle = style({
  fontWeight: vars.font.weight.bold,
  fontSize: vars.font.size.md,
  letterSpacing: "-0.01em",
  color: "#fff",
});

export const chatHeaderSub = style({
  fontSize: vars.font.size["2xs"],
  color: "rgba(255,255,255,0.65)",
  marginTop: "1px",
});

export const modelBtn = style({
  marginTop: "3px",
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: vars.radius.pill,
  padding: "3px 10px 3px 8px",
  cursor: "pointer",
  transition: "background 0.15s",
  position: "relative",
  selectors: {
    "&:hover": { background: "rgba(255,255,255,0.25)" },
  },
});

export const modelBtnDot = style({
  width: 6,
  height: 6,
  borderRadius: vars.radius.pill,
  background: "rgba(255,255,255,0.6)",
  flexShrink: 0,
});

export const modelBtnName = style({
  fontSize: vars.font.size.xs,
  color: "#fff",
  fontWeight: vars.font.weight.medium,
});

export const modelBtnBadge = style({
  fontSize: "9px",
  background: "rgba(255,255,255,0.2)",
  color: "rgba(255,255,255,0.9)",
  borderRadius: vars.radius.pill,
  padding: "0 5px",
});

export const modelBtnChevron = style({
  fontSize: "9px",
  color: "rgba(255,255,255,0.7)",
});

/** 모델 토글 버튼과 드롭다운을 형제로 담는 포지셔닝 기준 래퍼 (드롭다운 absolute 기준). */
export const modelBtnWrap = style({
  position: "relative",
});

export const modelDropdown = style({
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.md,
  minWidth: "220px",
  padding: "6px 0",
  zIndex: 10,
});

export const modelDropdownProvider = style({
  padding: `6px 12px 3px`,
  fontSize: "9px",
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
});

// <button>으로 렌더링되므로(S6819) 기본 버튼 크롬(테두리/배경/정렬)을 리셋한다.
export const modelDropdownItem = style({
  width: "100%",
  border: "none",
  background: "none",
  textAlign: "left",
  font: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `7px 12px`,
  cursor: "pointer",
  gap: vars.space["2"],
  transition: "background 0.1s",
  selectors: {
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const modelDropdownItemActive = style({
  background: vars.color.selectedBg,
  selectors: {
    "&:hover": { background: vars.color.selectedBg },
  },
});

export const modelDropdownItemName = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textPrimary,
  fontWeight: vars.font.weight.medium,
  selectors: {
    [`${modelDropdownItemActive} &`]: {
      color: vars.color.primary,
      fontWeight: vars.font.weight.semibold,
    },
  },
});

export const modelDropdownDivider = style({
  border: "none",
  borderTop: `1px solid ${vars.color.surfaceSecondary}`,
  margin: "4px 0",
});

export const modelDropdownBadge = styleVariants({
  blue:   { fontSize: "9px", fontWeight: "500", color: "#0064E0", background: "#EEF4FF", borderRadius: "100px", padding: "1px 6px" },
  purple: { fontSize: "9px", fontWeight: "500", color: "#7C3AED", background: "#F5F3FF", borderRadius: "100px", padding: "1px 6px" },
  green:  { fontSize: "9px", fontWeight: "500", color: "#059669", background: "#ECFDF5", borderRadius: "100px", padding: "1px 6px" },
  gray:   { fontSize: "9px", fontWeight: "500", color: "#6B7280", background: "#F3F4F6", borderRadius: "100px", padding: "1px 6px" },
});

export const modelDropdownBackdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 9,
});

export const modelDropdownCheck = style({
  color: vars.color.primary,
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.bold,
  marginLeft: vars.space["1"],
});

// ── messages ───────────────────────────────────────────────────────────────

export const chatMessages = style({
  flex: 1,
  overflowY: "auto",
  padding: `${vars.space["4"]} ${vars.space["3"]}`,
  scrollBehavior: "smooth",
});

export const chatEmpty = style({
  textAlign: "center",
  color: vars.color.textDisabled,
  fontSize: vars.font.size.md,
  marginTop: "48px",
  lineHeight: 1.7,
});

export const chatEmptyIcon = style({
  fontSize: "32px",
  marginBottom: "10px",
  opacity: 0.6,
});

export const chatThinking = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  color: vars.color.textDisabled,
  fontSize: vars.font.size.sm,
  padding: `${vars.space["1"]} 0`,
});

export const thinkingDots = style({
  display: "flex",
  gap: "3px",
});

export const thinkingDot = style({
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  background: "#93c5fd",
  animation: `${dotBounce} 1.2s ease-in-out infinite`,
});

globalStyle(`${thinkingDot}:nth-child(2)`, { animationDelay: "0.2s" });
globalStyle(`${thinkingDot}:nth-child(3)`, { animationDelay: "0.4s" });

// ── input area ─────────────────────────────────────────────────────────────

export const chatInputArea = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderTop: `1px solid ${vars.color.border}`,
  display: "flex",
  gap: vars.space["2"],
  alignItems: "flex-end",
  flexShrink: 0,
  background: vars.color.surface,
});

export const chatTextarea = style({
  flex: 1,
  resize: "none",
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `9px ${vars.space["3"]}`,
  fontSize: vars.font.size.md,
  fontFamily: vars.font.family,
  outline: "none",
  lineHeight: 1.5,
  color: vars.color.textPrimary,
  transition: "border-color 0.15s",
  selectors: {
    "&:focus":        { borderColor: vars.color.primary },
    "&::placeholder": { color: vars.color.textDisabled },
  },
});

export const chatSendBtnBase = style({
  width: "36px",
  height: "36px",
  flexShrink: 0,
  background: AI_GRADIENT,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "15px",
  transition: "opacity 0.15s, transform 0.15s",
  selectors: {
    "&:hover:not(:disabled)": { transform: "scale(1.07)" },
  },
});

export const chatSendBtnDisabled = style({ opacity: 0.35, cursor: "default" });
export const chatSendBtnEnabled  = style({ opacity: 1 });

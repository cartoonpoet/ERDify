import { style, keyframes, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

const AI_GRADIENT = "linear-gradient(135deg, #2563eb 0%, #5b21b6 100%)";
const TRANSITION_CURVE = "cubic-bezier(0.4, 0, 0.2, 1)";
const MORPH_DURATION = "0.38s";

// ── keyframes ──────────────────────────────────────────────────────────────

const pulse = keyframes({
  "0%":   { transform: "scale(1)",    opacity: 0.7 },
  "70%":  { transform: "scale(1.35)", opacity: 0 },
  "100%": { transform: "scale(1.35)", opacity: 0 },
});

const dotBounce = keyframes({
  "0%, 60%, 100%": { transform: "translateY(0)",   opacity: 0.4 },
  "30%":           { transform: "translateY(-4px)", opacity: 1 },
});

// ── container base ─────────────────────────────────────────────────────────

const floatContainerBase = style({
  position: "fixed",
  bottom: "24px",
  right: "24px",
  zIndex: 1000,
  overflow: "hidden",
  transformOrigin: "bottom right",
  transition: [
    `width    ${MORPH_DURATION} ${TRANSITION_CURVE}`,
    `height   ${MORPH_DURATION} ${TRANSITION_CURVE}`,
    `border-radius ${MORPH_DURATION} ${TRANSITION_CURVE}`,
    `box-shadow ${MORPH_DURATION} ease`,
  ].join(", "),
});

export const floatContainerClosed = style([floatContainerBase, {
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  cursor: "pointer",
  background: AI_GRADIENT,
  boxShadow: "0 4px 24px rgba(37,99,235,0.45)",
  selectors: {
    "&:hover": {
      boxShadow: "0 6px 32px rgba(37,99,235,0.6)",
      transform: "scale(1.07)",
    },
    "&::before": {
      content: '""',
      position: "absolute",
      inset: "-4px",
      borderRadius: "50%",
      border: "2px solid rgba(99,102,241,0.5)",
      animation: `${pulse} 2.4s ease-out infinite`,
      pointerEvents: "none",
    },
  },
}]);

export const floatContainerOpen = style([floatContainerBase, {
  width: "360px",
  height: "500px",
  borderRadius: vars.radius.lg,
  background: vars.color.surface,
  boxShadow: vars.shadow.xl,
  cursor: "default",
}]);

// ── FAB icon layer ─────────────────────────────────────────────────────────

const fabContentBase = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2px",
  pointerEvents: "none",
  transition: `opacity 0.18s ease`,
});

export const fabContentClosed = style([fabContentBase, { opacity: 1 }]);
export const fabContentOpen   = style([fabContentBase, { opacity: 0 }]);

export const fabIcon = style({
  fontSize: "22px",
  lineHeight: 1,
  filter: "drop-shadow(0 0 6px rgba(255,255,255,0.5))",
});

export const fabLabel = style({
  fontSize: "9px",
  fontWeight: vars.font.weight.bold,
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.85)",
  textTransform: "uppercase",
});

// ── chat window layer ──────────────────────────────────────────────────────

const chatContentBase = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  background: vars.color.surface,
  borderRadius: vars.radius.lg,
  overflow: "hidden",
  transition: `opacity 0.2s ease 0.22s`,
});

export const chatContentClosed = style([chatContentBase, { opacity: 0, pointerEvents: "none" }]);
export const chatContentOpen   = style([chatContentBase, { opacity: 1, pointerEvents: "auto" }]);

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

export const chatCloseBtn = style({
  background: "rgba(255,255,255,0.15)",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  lineHeight: 1,
  transition: "background 0.15s",
  selectors: {
    "&:hover": { background: "rgba(255,255,255,0.28)" },
  },
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

import { style, keyframes } from "@vanilla-extract/css";
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

// ── shared styles (re-exported from ai-chat-shared.css.ts) ─────────────────

export {
  chatHeader,
  chatHeaderLeft,
  chatHeaderIcon,
  chatHeaderTitle,
  chatHeaderSub,
  modelBtn,
  modelBtnDot,
  modelBtnName,
  modelBtnBadge,
  modelBtnChevron,
  modelDropdown,
  modelDropdownProvider,
  modelDropdownItem,
  modelDropdownItemActive,
  modelDropdownItemName,
  modelDropdownDivider,
  modelDropdownBadge,
  modelDropdownBackdrop,
  modelDropdownCheck,
  chatMessages,
  chatEmpty,
  chatEmptyIcon,
  chatThinking,
  thinkingDots,
  thinkingDot,
  chatInputArea,
  chatTextarea,
  chatSendBtnBase,
  chatSendBtnDisabled,
  chatSendBtnEnabled,
} from "./ai-chat-shared.css";

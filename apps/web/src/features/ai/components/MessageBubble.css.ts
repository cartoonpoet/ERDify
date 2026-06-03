import { style, keyframes, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

const blink = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0 },
});

export const wrapperUser = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  marginBottom: vars.space["3"],
});

export const wrapperAssistant = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  marginBottom: vars.space["3"],
});

export const bubbleUser = style({
  maxWidth: "80%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: "12px 12px 2px 12px",
  background: vars.color.primary,
  color: "#fff",
  fontSize: vars.font.size.md,
  lineHeight: "1.5",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const bubbleAssistant = style({
  maxWidth: "80%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: "12px 12px 12px 2px",
  background: vars.color.surfaceSecondary,
  color: vars.color.textPrimary,
  fontSize: vars.font.size.md,
  lineHeight: "1.5",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const diffArea = style({
  width: "80%",
  marginTop: vars.space["1"],
});

export const streamingCursor = style({
  display: "inline-block",
  marginLeft: "2px",
  animation: `${blink} 1s step-end infinite`,
  color: "inherit",
});

/**
 * 어시스턴트 답변 마크다운 렌더링 영역.
 * react-markdown이 생성하는 자식 엘리먼트(p, ul, code 등)를 버블 안에서 다듬는다.
 */
export const markdown = style({
  // 버블 컨테이너의 pre-wrap을 상속받으면 블록 요소 사이에 빈 줄이 생긴다.
  whiteSpace: "normal",
});

globalStyle(`${markdown} > *:first-child`, { marginTop: 0 });
globalStyle(`${markdown} > *:last-child`, { marginBottom: 0 });

globalStyle(`${markdown} p`, {
  margin: `0 0 ${vars.space["2"]}`,
});

globalStyle(`${markdown} ul, ${markdown} ol`, {
  margin: `0 0 ${vars.space["2"]}`,
  paddingLeft: vars.space["5"],
});

globalStyle(`${markdown} li`, {
  margin: `${vars.space["1"]} 0`,
});

globalStyle(`${markdown} li > p`, {
  margin: 0,
});

globalStyle(
  `${markdown} h1, ${markdown} h2, ${markdown} h3, ${markdown} h4, ${markdown} h5, ${markdown} h6`,
  {
    margin: `${vars.space["3"]} 0 ${vars.space["2"]}`,
    fontWeight: vars.font.weight.semibold,
    fontSize: vars.font.size.lg,
    lineHeight: "1.3",
  },
);

globalStyle(`${markdown} a`, {
  color: vars.color.primary,
  textDecoration: "underline",
});

globalStyle(`${markdown} strong`, {
  fontWeight: vars.font.weight.semibold,
});

globalStyle(`${markdown} code`, {
  fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  fontSize: "0.9em",
  padding: "1px 5px",
  borderRadius: vars.radius.sm,
  background: "rgba(0, 0, 0, 0.06)",
});

globalStyle(`${markdown} pre`, {
  margin: `0 0 ${vars.space["2"]}`,
  padding: vars.space["3"],
  borderRadius: vars.radius.md,
  background: "rgba(0, 0, 0, 0.06)",
  overflowX: "auto",
});

globalStyle(`${markdown} pre code`, {
  padding: 0,
  background: "transparent",
  fontSize: vars.font.size.sm,
});

globalStyle(`${markdown} blockquote`, {
  margin: `0 0 ${vars.space["2"]}`,
  paddingLeft: vars.space["3"],
  borderLeft: `3px solid ${vars.color.border}`,
  color: vars.color.textSecondary,
});

globalStyle(`${markdown} table`, {
  borderCollapse: "collapse",
  margin: `0 0 ${vars.space["2"]}`,
  fontSize: vars.font.size.sm,
});

globalStyle(`${markdown} th, ${markdown} td`, {
  border: `1px solid ${vars.color.border}`,
  padding: `${vars.space["1"]} ${vars.space["2"]}`,
  textAlign: "left",
});

globalStyle(`${markdown} hr`, {
  margin: `${vars.space["3"]} 0`,
  border: "none",
  borderTop: `1px solid ${vars.color.border}`,
});

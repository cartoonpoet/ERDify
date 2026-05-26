import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

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

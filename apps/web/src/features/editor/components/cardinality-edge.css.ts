import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

const edgeLabelBase = {
  position: "absolute" as const,
  fontSize: 10,
  fontWeight: vars.font.weight.bold,
  padding: "1px 3px",
  borderRadius: 3,
  pointerEvents: "none" as const,
  lineHeight: 1,
};

export const edgeLabel = style({
  ...edgeLabelBase,
  color: "#6366f1",
  background: "#ffffff",
});

export const edgeLabelSelected = style({
  ...edgeLabelBase,
  color: "#4f46e5",
  background: "#ede9fe",
  boxShadow: "0 0 0 1px #c4b5fd",
});

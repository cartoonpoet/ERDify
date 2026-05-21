import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const edgeLabel = style({
  position: "absolute",
  fontSize: 10,
  fontWeight: vars.font.weight.bold,
  color: "#6366f1",
  background: "#ffffff",
  padding: "1px 3px",
  borderRadius: 3,
  pointerEvents: "none",
  lineHeight: 1,
});

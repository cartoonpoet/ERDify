import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const root = style({
  width: "100%",
  height: "100%",
  position: "relative",
});

export const emptyOverlay = style({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 10,
  textAlign: "center",
  pointerEvents: "none",
});

export const emptyText = style({
  color: "#94a3b8",
  fontSize: 14,
  marginBottom: 16,
});

export const aiButton = style({
  pointerEvents: "auto",
  padding: "10px 20px",
  background: "#2563eb",
  color: vars.color.surface,
  border: "none",
  borderRadius: vars.radius.md,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: Number(vars.font.weight.medium),
});

export const minimapWrapper = style({
  position: "absolute",
  bottom: 56,
  right: 8,
  display: "flex",
  flexDirection: "column",
  gap: 0,
  zIndex: 5,
});

export const minimapDragArea = style({
  cursor: "pointer",
  selectors: {
    "&[data-dragging]": {
      cursor: "grabbing",
    },
  },
});

globalStyle(`${minimapDragArea} .react-flow__minimap-svg`, {
  cursor: "inherit",
});

// react-flow__panel 기본 스타일(absolute + margin)을 덮어써 minimapWrapper 흐름에 배치
globalStyle(`${minimapDragArea} .react-flow__minimap`, {
  position: "static",
  margin: 0,
  borderRadius: 6,
});

globalStyle(`${minimapDragArea}[data-with-legend] .react-flow__minimap`, {
  borderRadius: "0 0 6px 6px",
});

export const schemaLegend = style({
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #e2e8f0",
  borderRadius: "6px 6px 0 0",
  padding: "5px 8px",
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 8px",
  maxWidth: 200,
  backdropFilter: "blur(4px)",
});

export const schemaLegendItem = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
});

export const schemaLegendDot = style({
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
});

export const schemaLegendLabel = style({
  fontSize: vars.font.size["2xs"],
  color: "#374151",
  whiteSpace: "nowrap",
});

export const schemaZone = style({
  width: "100%",
  height: "100%",
  borderRadius: 14,
  pointerEvents: "none",
});

export const schemaZoneLabel = style({
  padding: "8px 12px",
  fontSize: vars.font.size.xs,
  fontWeight: Number(vars.font.weight.bold),
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  opacity: 0.6,
});

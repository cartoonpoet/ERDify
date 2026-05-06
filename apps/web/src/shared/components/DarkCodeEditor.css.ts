import { style } from "@vanilla-extract/css";

export const container = style({
  display: "flex",
  background: "#0d1821",
  borderRadius: "8px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  fontFamily: "var(--font-mono, 'Courier New', 'Consolas', monospace)",
  fontSize: "12px",
  lineHeight: "1.7",
  position: "relative",
});

export const lineNumbers = style({
  padding: "12px 0",
  minWidth: "42px",
  textAlign: "right",
  paddingRight: "10px",
  paddingLeft: "8px",
  background: "#0a141c",
  color: "rgba(255,255,255,0.2)",
  userSelect: "none",
  flexShrink: 0,
  overflowY: "hidden",
  borderRight: "1px solid rgba(255,255,255,0.04)",
});

export const lineNumber = style({
  display: "block",
  lineHeight: "1.7",
});

export const codeArea = style({
  flex: 1,
  padding: "12px",
  overflowX: "auto",
  overflowY: "auto",
  color: "#7dd3fc",
  whiteSpace: "pre",
  margin: 0,
});

export const editableArea = style({
  flex: 1,
  padding: "12px",
  background: "transparent",
  border: "none",
  outline: "none",
  resize: "none",
  color: "#7dd3fc",
  fontFamily: "var(--font-mono, 'Courier New', 'Consolas', monospace)",
  fontSize: "12px",
  lineHeight: "1.7",
  overflowX: "auto",
  overflowY: "auto",
  boxSizing: "border-box",
  width: "100%",
});

export const dragOverlay = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,100,224,0.12)",
  border: "2px dashed rgba(0,100,224,0.5)",
  borderRadius: "8px",
  color: "rgba(255,255,255,0.7)",
  fontSize: "13px",
  pointerEvents: "none",
});

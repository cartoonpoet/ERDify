import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
});

globalStyle("body", {
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  background: vars.color.surface,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("a", {
  color: "inherit",
  textDecoration: "none",
});

globalStyle("button", {
  fontFamily: vars.font.family,
});

globalStyle("input, textarea, select", {
  fontFamily: vars.font.family,
});

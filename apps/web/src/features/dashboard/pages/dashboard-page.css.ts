import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const shell = style({
  display: "grid",
  gridTemplateRows: "48px 1fr",
  height: "100vh",
  overflow: "hidden",
});

export const topbar = style({
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  padding: `0 ${vars.space["5"]}`,
  gap: vars.space["3"],
});

export const brand = style({
  fontSize: "16px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  letterSpacing: "-0.3px",
});

export const brandAccent = style({ color: vars.color.primary });

export const topbarSpacer = style({ flex: 1 });

export const avatar = style({
  width: "30px",
  height: "30px",
  background: vars.color.primary,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
});

export const body = style({
  display: "grid",
  gridTemplateColumns: "52px 220px 1fr",
  overflow: "hidden",
});

export const emptySidebar = style({
  width: "220px",
  borderRight: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

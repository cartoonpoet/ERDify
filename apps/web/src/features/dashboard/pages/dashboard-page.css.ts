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

export const avatarImg = style({
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  objectFit: "cover",
  cursor: "pointer",
  border: `1.5px solid ${vars.color.border}`,
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

export const avatarWrapper = style({
  position: "relative",
  outline: "none",
});

export const dropdown = style({
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.lg,
  minWidth: "200px",
  overflow: "hidden",
  zIndex: 200,
});

export const dropdownHeader = style({
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const dropdownEmail = style({
  fontSize: "13px",
  fontWeight: "600",
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const dropdownItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  width: "100%",
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const dropdownItemDanger = style({
  color: vars.color.error,
  selectors: {
    "&:hover": { background: `${vars.color.error}0f` },
  },
});

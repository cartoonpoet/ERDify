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
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
});

export const brandLogo = style({
  display: "block",
  width: "123px",
  height: "32px",
});

export const topbarSpacer = style({ flex: 1 });

export const topbarSearch = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  background: vars.color.surfaceTertiary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  width: "220px",
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.focusRing}` },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
});

export const avatar = style({
  width: "30px",
  height: "30px",
  background: vars.color.primary,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
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
  gridTemplateColumns: "260px 1fr",
  overflow: "hidden",
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
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.semibold,
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
  fontSize: vars.font.size.md,
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

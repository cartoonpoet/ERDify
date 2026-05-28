import { style } from "@vanilla-extract/css";
import { vars } from "../../../style/tokens.css";

export const page = style({
  minHeight: "100vh",
  background: `linear-gradient(135deg, #f0f4ff 0%, ${vars.color.surfaceSecondary} 60%, #f5f0ff 100%)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space["6"],
});

export const card = style({
  background: vars.color.surface,
  borderRadius: vars.radius.xl,
  boxShadow: vars.shadow.lg,
  padding: `${vars.space["8"]} ${vars.space["7"]}`,
  width: "100%",
  maxWidth: "380px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  borderTop: `3px solid ${vars.color.primary}`,
});

export const brand = style({
  display: "flex",
  alignItems: "center",
  marginBottom: "4px",
});

export const brandLogo = style({
  display: "block",
  width: "138px",
  height: "36px",
});

export const tagline = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  marginBottom: vars.space["6"],
  textAlign: "center",
  lineHeight: 1.5,
});

export const form = style({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const authLink = style({
  textAlign: "center",
  fontSize: "13px",
  color: vars.color.textSecondary,
  marginTop: vars.space["2"],
});

export const authLinkAnchor = style({
  color: vars.color.primary,
  fontWeight: "500",
  cursor: "pointer",
  selectors: { "&:hover": { textDecoration: "underline" } },
});

export const strengthBars = style({
  display: "flex",
  gap: "4px",
  marginTop: "6px",
});

export const strengthBar = style({
  flex: 1,
  height: "3px",
  borderRadius: "2px",
  background: vars.color.border,
  transition: "background 200ms ease",
});

export const strengthBarFilled = style({
  background: vars.color.success,
});

export const sessionBanner = style({
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.md,
  background: "#fef3c7",
  border: "1px solid #f59e0b",
  color: "#92400e",
  fontSize: "13px",
  textAlign: "center",
  marginBottom: vars.space["2"],
});

export const emailRow = style({
  display: "flex",
  gap: 8,
  alignItems: "flex-end",
});

export const codeRow = style({
  marginTop: 8,
  display: "flex",
  gap: 8,
  alignItems: "flex-end",
});

export const verifiedBadge = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 6,
  fontSize: 13,
  color: vars.color.success,
  fontWeight: vars.font.weight.semibold,
});

export const codeError = style({
  fontSize: 12,
  color: vars.color.error,
  marginTop: 4,
});

export const formError = style({
  fontSize: 13,
  color: vars.color.error,
  margin: 0,
});

export const socialDivider = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  width: "100%",
  color: vars.color.textSecondary,
  fontSize: vars.font.size.md,
  marginTop: vars.space["3"],
  selectors: {
    "&::before": {
      content: '""',
      flex: 1,
      height: "1px",
      background: vars.color.border,
    },
    "&::after": {
      content: '""',
      flex: 1,
      height: "1px",
      background: vars.color.border,
    },
  },
});

export const socialButtonContainer = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
  width: "100%",
  marginTop: vars.space["2"],
});

export const socialButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["2"],
  width: "100%",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  cursor: "pointer",
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.medium,
  fontFamily: vars.font.family,
  transition: "opacity 150ms ease",
  selectors: {
    "&:hover:not(:disabled)": {
      opacity: 0.88,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
});

export const kakaoButton = style({
  background: "#FEE500",
  color: "#191919",
  borderColor: "#FEE500",
});

export const naverButton = style({
  background: "#03C75A",
  color: "#FFFFFF",
  borderColor: "#03C75A",
});

export const googleButton = style({
  background: "#FFFFFF",
  color: "#3C4043",
  borderColor: "#DADCE0",
});

export const socialComingSoonBadge = style({
  fontSize: "11px",
  fontWeight: vars.font.weight.medium,
  color: vars.color.textSecondary,
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.pill,
  padding: `1px ${vars.space["2"]}`,
  marginLeft: "auto",
});

export const onboardTitle = style({
  fontSize: vars.font.size["2xl"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary,
  textAlign: "center",
  marginBottom: vars.space["2"],
});

export const onboardSubtitle = style({
  fontSize: vars.font.size.md,
  color: vars.color.textSecondary,
  textAlign: "center",
  marginBottom: vars.space["5"],
});

import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const backdrop = style({
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000,
});

export const panel = style({
  background: vars.color.surface, borderRadius: vars.radius.xl,
  boxShadow: vars.shadow.xl, width: "100%", maxWidth: "440px",
  overflow: "hidden",
});

export const header = style({
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: `${vars.space["5"]} ${vars.space["5"]} 0`,
});

export const headerTitle = style({
  fontSize: vars.font.size.lg, fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary, letterSpacing: "-0.3px",
});

export const counter = style({
  fontSize: vars.font.size.sm, color: vars.color.textDisabled,
  fontWeight: vars.font.weight.medium,
});

export const closeBtn = style({
  width: "26px", height: "26px", borderRadius: vars.radius.sm,
  background: "none", border: "none", cursor: "pointer",
  color: vars.color.textSecondary, fontSize: "18px",
  display: "flex", alignItems: "center", justifyContent: "center",
  selectors: { "&:disabled": { opacity: 0.2, cursor: "not-allowed" } },
});

export const dots = style({
  display: "flex", alignItems: "center", justifyContent: "center",
  gap: "6px", padding: `${vars.space["3"]} ${vars.space["5"]} 0`,
});

export const dot = style({
  width: "6px", height: "6px", borderRadius: "50%",
  background: vars.color.borderStrong, transition: "background 0.15s, width 0.15s",
});

export const dotActive = style({
  background: vars.color.primary, width: "18px", borderRadius: "3px",
});

export const divider = style({ height: "1px", background: vars.color.border, margin: `0 ${vars.space["5"]}` });

export const navRow = style({
  display: "flex", alignItems: "center", gap: vars.space["2"],
  padding: `${vars.space["4"]} ${vars.space["5"]} ${vars.space["5"]}`,
});

export const navBtn = style({
  width: "32px", height: "32px", borderRadius: "50%",
  border: `1.5px solid ${vars.color.border}`, background: vars.color.surface,
  color: vars.color.textSecondary, fontSize: "16px", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  selectors: {
    "&:hover:not(:disabled)": { borderColor: vars.color.primary, color: vars.color.primary },
    "&:disabled": { opacity: 0.3, cursor: "not-allowed" },
  },
});

export const noShow = style({
  padding: `6px ${vars.space["3"]}`, borderRadius: vars.radius.pill,
  border: `1.5px solid ${vars.color.border}`, background: "transparent",
  color: vars.color.textSecondary, fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium, cursor: "pointer",
  selectors: { "&:hover": { background: vars.color.surfaceSecondary } },
});

export const spacer = style({ flex: 1 });

export const confirmBtn = style({
  padding: `7px ${vars.space["5"]}`, borderRadius: vars.radius.pill,
  background: vars.color.primary, color: "#fff",
  fontSize: vars.font.size.md, fontWeight: vars.font.weight.medium,
  border: "none", cursor: "pointer",
  selectors: { "&:hover": { background: vars.color.primaryHover } },
});

import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const kindTabsRow = style({
  display: "flex",
  gap: 4,
  marginBottom: 14,
});

const kindTabBase = style({
  padding: "4px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontFamily: vars.font.family,
});

export const kindTabVariants = styleVariants({
  active: [
    kindTabBase,
    {
      background: vars.color.primary,
      color: "#fff",
      border: `1px solid ${vars.color.primary}`,
      fontWeight: vars.font.weight.semibold,
    },
  ],
  inactive: [
    kindTabBase,
    {
      background: "none",
      color: "#374151",
      border: `1px solid ${vars.color.border}`,
      fontWeight: vars.font.weight.regular,
    },
  ],
});

export const fieldLabel = style({
  fontSize: 11,
  color: vars.color.textSecondary,
  marginBottom: 4,
});

export const nameField = style({
  marginBottom: 14,
});

export const warningText = style({
  color: "#ef4444",
  fontSize: 12,
  marginTop: 8,
});

export const actionsRow = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginTop: 16,
});

export const actionsRowRight = style({
  display: "flex",
  gap: 8,
});

export const btnBase = style({
  padding: "6px 14px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: 6,
  background: "none",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: vars.font.family,
  selectors: {
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

export const cancelBtn = style([btnBase, {}]);

export const deleteBtn = style([
  btnBase,
  {
    color: "#ef4444",
    borderColor: "#ef4444",
    selectors: {
      "&:hover": {
        background: "color-mix(in srgb, #ef4444 10%, transparent)",
      },
    },
  },
]);

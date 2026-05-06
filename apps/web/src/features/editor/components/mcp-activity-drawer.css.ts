import { style } from "@vanilla-extract/css";

export const drawer = style({
  width: "300px",
  height: "100%",
  background: "#ffffff",
  borderLeft: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
});

export const drawerHeader = style({
  padding: "14px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #e5e7eb",
});

export const drawerTitleGroup = style({
  display: "flex",
  gap: "8px",
  alignItems: "center",
});

export const drawerTitle = style({
  fontSize: "14px",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
});

export const newBadge = style({
  background: "#0064E0",
  color: "#ffffff",
  fontSize: "10px",
  fontWeight: 700,
  padding: "1px 7px",
  borderRadius: "99px",
});

export const closeBtn = style({
  background: "none",
  border: "none",
  color: "#9ca3af",
  fontSize: "18px",
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
});

export const drawerBody = style({
  flex: 1,
  overflowY: "auto",
});

export const sessionItem = style({
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
});

export const sessionItemNew = style({
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fbff",
});

export const sessionTimestamp = style({
  fontSize: "11px",
  color: "#9ca3af",
  marginBottom: "6px",
});

export const sessionTimestampNew = style({
  display: "flex",
  gap: "6px",
  alignItems: "center",
  marginBottom: "6px",
});

export const newDot = style({
  width: "7px",
  height: "7px",
  background: "#0064E0",
  borderRadius: "50%",
  flexShrink: 0,
});

export const newTimestampText = style({
  fontSize: "11px",
  color: "#0064E0",
  fontWeight: 600,
});

export const sessionSummary = style({
  fontSize: "13px",
  color: "#111827",
  fontWeight: 500,
  lineHeight: 1.5,
  marginBottom: "10px",
});

export const sessionSummaryOld = style({
  fontSize: "13px",
  color: "#374151",
  lineHeight: 1.5,
  marginBottom: "10px",
});

export const toolCallList = style({
  background: "#f1f4f7",
  borderRadius: "8px",
  padding: "8px 10px",
  marginBottom: "10px",
  fontSize: "11px",
  color: "#6b7280",
});

export const toolCallItem = style({
  marginBottom: "3px",
  selectors: {
    "&:last-child": { marginBottom: 0 },
  },
});

export const sessionActions = style({
  display: "flex",
  gap: "8px",
  alignItems: "center",
});

export const toggleBtn = style({
  fontSize: "11px",
  color: "#6b7280",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
});

export const spacer = style({
  flex: 1,
});

export const revertBtn = style({
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "5px 12px",
  fontSize: "12px",
  fontWeight: 500,
  color: "#374151",
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

export const emptyText = style({
  padding: "32px 16px",
  textAlign: "center",
  color: "#9ca3af",
  fontSize: "13px",
});

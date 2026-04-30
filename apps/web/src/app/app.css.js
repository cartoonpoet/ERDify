import { style } from "@vanilla-extract/css";
export const shell = style({
    minHeight: "100vh",
    background: "#f6f8fb",
    color: "#172033"
});
export const topbar = style({
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderBottom: "1px solid #d8dee8",
    background: "#ffffff"
});
export const brand = style({
    fontSize: 18,
    fontWeight: 700
});
export const content = style({
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    minHeight: "calc(100vh - 56px)"
});
export const sidebar = style({
    borderRight: "1px solid #d8dee8",
    background: "#ffffff",
    padding: "16px"
});
export const main = style({
    padding: "24px"
});
export const emptyState = style({
    display: "flex",
    minHeight: "360px",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed #b7c2d3",
    background: "#ffffff"
});

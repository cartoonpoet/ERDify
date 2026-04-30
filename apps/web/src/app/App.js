import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import { brand, content, emptyState, main, shell, sidebar, topbar } from "./app.css";
export function App() {
    return (_jsxs("div", { className: `${lightThemeClass} ${shell}`, children: [_jsxs("header", { className: topbar, children: [_jsx("div", { className: brand, children: "ERDify" }), _jsx(Button, { color: "primary", size: "medium", children: "\uC0C8 ERD" })] }), _jsxs("div", { className: content, children: [_jsx("aside", { className: sidebar, children: "\uD504\uB85C\uC81D\uD2B8" }), _jsx("main", { className: main, children: _jsx("section", { className: emptyState, children: "\uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD558\uBA74 ERD \uBAA9\uB85D\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4." }) })] })] }));
}

import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
describe("App", () => {
    it("renders the editor-first dashboard shell", () => {
        render(_jsx(App, {}));
        expect(screen.getByText("ERDify")).toBeInTheDocument();
        expect(screen.getByText("새 ERD")).toBeInTheDocument();
        expect(screen.getByText("프로젝트를 선택하면 ERD 목록이 표시됩니다.")).toBeInTheDocument();
    });
});

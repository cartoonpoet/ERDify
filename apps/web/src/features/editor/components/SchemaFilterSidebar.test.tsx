import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SchemaFilterSidebar } from "./SchemaFilterSidebar";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/editor-store.types";

vi.mock("@/features/editor/store/useEditorStore");

vi.mock("./schema-filter-sidebar.css", () => ({
  containerVariants: { expanded: "expanded", collapsed: "collapsed" },
  toggleButton: "toggleButton",
  expandedContent: "expandedContent",
  sectionTitle: "sectionTitle",
  divider: "divider",
  collapsedStrip: "collapsedStrip",
  collapsedSchemaButton: "collapsedSchemaButton",
  collapsedDot: "collapsedDot",
  filterRowContainer: "filterRowContainer",
  hiddenCheckboxInput: "hiddenCheckboxInput",
  filterCheckbox: "filterCheckbox",
  checkMark: "checkMark",
  colorPickerDot: "colorPickerDot",
  hiddenColorInput: "hiddenColorInput",
  filterLabel: "filterLabel",
  filterCount: "filterCount",
  filterRowVariants: { normal: "normal", dimmed: "dimmed" },
  filterRowCheckbox: "filterRowCheckbox",
  filterRowDot: "filterRowDot",
  filterRowLabel: "filterRowLabel",
  filterRowCount: "filterRowCount",
}));

interface StoreOverrides {
  allSchemas?: string[];
  hiddenSchemas?: Set<string>;
  schemaFilterExpanded?: boolean;
  toggleSchemaVisibility?: (schema: string) => void;
  setSchemaFilterExpanded?: (expanded: boolean) => void;
  schemaColors?: Record<string, string>;
  setSchemaColor?: (schema: string, color: string) => void;
  document?: EditorState["document"];
}

const setupStore = (overrides: StoreOverrides = {}) => {
  const state = {
    allSchemas: [],
    hiddenSchemas: new Set<string>(),
    schemaFilterExpanded: true,
    toggleSchemaVisibility: vi.fn(),
    setSchemaFilterExpanded: vi.fn(),
    schemaColors: {},
    setSchemaColor: vi.fn(),
    document: undefined,
    ...overrides,
  } as unknown as EditorState;

  vi.mocked(useEditorStore).mockImplementation(
    (selector: (s: EditorState) => unknown) => selector(state)
  );

  return state;
};

describe("SchemaFilterSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("접힌 상태(collapsed)", () => {
    it("스키마별로 하나씩 dot-strip 버튼을 렌더링한다", () => {
      setupStore({ schemaFilterExpanded: false, allSchemas: ["auth", "billing"] });
      render(<SchemaFilterSidebar />);

      expect(screen.getByRole("button", { name: "auth 스키마 표시/숨기기" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "billing 스키마 표시/숨기기" })).toBeInTheDocument();
    });

    it("dot 버튼을 클릭하면 toggleSchemaVisibility가 해당 스키마와 함께 호출된다", () => {
      const state = setupStore({ schemaFilterExpanded: false, allSchemas: ["auth", "billing"] });
      render(<SchemaFilterSidebar />);

      fireEvent.click(screen.getByRole("button", { name: "auth 스키마 표시/숨기기" }));

      expect(state.toggleSchemaVisibility).toHaveBeenCalledWith("auth");
    });
  });

  describe("펼친 상태(expanded)", () => {
    it("'전체' FilterRow는 실제 checkbox input이며 모든 스키마가 보일 때 체크되어 있다", () => {
      setupStore({
        schemaFilterExpanded: true,
        allSchemas: ["auth", "billing"],
        hiddenSchemas: new Set(),
      });
      render(<SchemaFilterSidebar />);

      const allRow = screen.getByRole("checkbox", { name: "전체 표시/숨기기" });
      expect(allRow.tagName).toBe("INPUT");
      expect(allRow).toBeChecked();
    });

    it("일부 스키마가 숨겨져 있으면 '전체' 행의 체크박스는 체크되어 있지 않다", () => {
      setupStore({
        schemaFilterExpanded: true,
        allSchemas: ["auth", "billing"],
        hiddenSchemas: new Set(["billing"]),
      });
      render(<SchemaFilterSidebar />);

      const allRow = screen.getByRole("checkbox", { name: "전체 표시/숨기기" });
      expect(allRow).not.toBeChecked();
    });

    it("'전체' 행 체크박스를 클릭하면 모든 스키마의 표시 여부가 토글된다", () => {
      const state = setupStore({
        schemaFilterExpanded: true,
        allSchemas: ["auth", "billing"],
        hiddenSchemas: new Set(),
      });
      render(<SchemaFilterSidebar />);

      const allRow = screen.getByRole("checkbox", { name: "전체 표시/숨기기" });
      fireEvent.click(allRow);

      expect(state.toggleSchemaVisibility).toHaveBeenCalledTimes(2);
      expect(state.toggleSchemaVisibility).toHaveBeenCalledWith("auth");
      expect(state.toggleSchemaVisibility).toHaveBeenCalledWith("billing");
    });

    it("'전체' 행의 라벨 텍스트를 클릭해도 체크박스와 동일하게 토글된다 (label 연결)", () => {
      const state = setupStore({
        schemaFilterExpanded: true,
        allSchemas: ["auth", "billing"],
        hiddenSchemas: new Set(),
      });
      render(<SchemaFilterSidebar />);

      fireEvent.click(screen.getByText("전체"));

      expect(state.toggleSchemaVisibility).toHaveBeenCalledTimes(2);
    });

    it("스키마 행의 체크박스는 실제 input이며 숨김 여부에 따라 checked가 반영된다 (ColorableFilterRow)", () => {
      setupStore({
        schemaFilterExpanded: true,
        allSchemas: ["auth", "billing"],
        hiddenSchemas: new Set(["billing"]),
      });
      render(<SchemaFilterSidebar />);

      const authCheckbox = screen.getByRole("checkbox", { name: "auth 표시/숨기기" });
      const billingCheckbox = screen.getByRole("checkbox", { name: "billing 표시/숨기기" });
      expect(authCheckbox.tagName).toBe("INPUT");
      expect(authCheckbox).toBeChecked();
      expect(billingCheckbox).not.toBeChecked();
    });

    it("스키마 행 체크박스를 클릭하면 해당 스키마의 표시 여부가 토글된다 (ColorableFilterRow)", () => {
      const state = setupStore({
        schemaFilterExpanded: true,
        allSchemas: ["auth"],
        hiddenSchemas: new Set(),
      });
      render(<SchemaFilterSidebar />);

      fireEvent.click(screen.getByRole("checkbox", { name: "auth 표시/숨기기" }));

      expect(state.toggleSchemaVisibility).toHaveBeenCalledWith("auth");
    });

    it("스키마 행의 라벨 텍스트를 클릭해도 체크박스와 동일하게 토글된다 (label 연결, 중복 tabstop 없음)", () => {
      const state = setupStore({
        schemaFilterExpanded: true,
        allSchemas: ["auth"],
        hiddenSchemas: new Set(),
      });
      render(<SchemaFilterSidebar />);

      fireEvent.click(screen.getByText("auth"));

      expect(state.toggleSchemaVisibility).toHaveBeenCalledWith("auth");
    });

    it("색상 변경 버튼은 실제 button 요소이며 스키마명을 포함한 aria-label을 갖는다 (ColorableFilterRow)", () => {
      setupStore({
        schemaFilterExpanded: true,
        allSchemas: ["auth"],
        hiddenSchemas: new Set(),
      });
      render(<SchemaFilterSidebar />);

      const colorButton = screen.getByRole("button", { name: /색상 변경/ });
      expect(colorButton.tagName).toBe("BUTTON");
      expect(colorButton).toHaveAccessibleName("auth 색상 변경");
    });
  });
});

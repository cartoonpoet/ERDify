import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SharedDiagramPage } from "./SharedDiagramPage";
import { getPublicDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../../editor/stores/useEditorStore";

vi.mock("../../../shared/api/diagrams.api", () => ({
  getPublicDiagram: vi.fn(),
}));

vi.mock("../../editor/stores/useEditorStore");

vi.mock("../../editor/components/EditorCanvas", () => ({
  EditorCanvas: () => React.createElement("div", { "data-testid": "editor-canvas" }),
}));

vi.mock("../../../design-system/Skeleton", () => ({
  Skeleton: () => React.createElement("div", { "data-testid": "skeleton" }),
}));

vi.mock("./shared-diagram-page.css", () => ({
  root: "",
  topbar: "",
  content: "",
  diagramName: "",
  readOnlyBadge: "",
  errorPage: "",
  errorTitle: "",
}));

const mockSetDocument = vi.fn();
const mockSetCanEdit = vi.fn();

vi.mocked(useEditorStore).mockReturnValue({
  setDocument: mockSetDocument,
  setCanEdit: mockSetCanEdit,
} as any);

const createQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (shareToken: string, qc = createQc()) =>
  render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/share/${shareToken}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/share/:shareToken",
            element: React.createElement(SharedDiagramPage),
          })
        )
      )
    )
  );

describe("SharedDiagramPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditorStore).mockReturnValue({
      setDocument: mockSetDocument,
      setCanEdit: mockSetCanEdit,
    } as any);
  });

  it("loading state — skeleton elements visible", () => {
    vi.mocked(getPublicDiagram).mockReturnValue(new Promise(() => {}));
    wrap("tok123");
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("error 403 — shows '링크가 만료되었습니다'", async () => {
    const err = { response: { status: 403 } };
    vi.mocked(getPublicDiagram).mockRejectedValue(err);
    wrap("tok123");
    await waitFor(() =>
      expect(screen.getByText("링크가 만료되었습니다")).toBeInTheDocument()
    );
  });

  it("error 404 — shows '존재하지 않는 공유 링크입니다'", async () => {
    const err = { response: { status: 404 } };
    vi.mocked(getPublicDiagram).mockRejectedValue(err);
    wrap("tok123");
    await waitFor(() =>
      expect(screen.getByText("존재하지 않는 공유 링크입니다")).toBeInTheDocument()
    );
  });

  it("success — setDocument and setCanEdit(false) called, diagram name, badge, and canvas shown", async () => {
    const content = {
      format: "erdify.schema.v1",
      entities: [],
      relationships: [],
    };
    vi.mocked(getPublicDiagram).mockResolvedValue({
      id: "d-1",
      name: "My ERD",
      content,
    } as any);
    wrap("tok123");
    await waitFor(() =>
      expect(screen.getByText("My ERD")).toBeInTheDocument()
    );
    expect(mockSetDocument).toHaveBeenCalledWith(content);
    expect(mockSetCanEdit).toHaveBeenCalledWith(false);
    expect(screen.getByText("읽기 전용")).toBeInTheDocument();
    expect(screen.getByTestId("editor-canvas")).toBeInTheDocument();
  });
});

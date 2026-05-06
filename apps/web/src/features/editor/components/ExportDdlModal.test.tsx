import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportDdlModal } from "./ExportDdlModal";
import { useEditorStore } from "../stores/useEditorStore";
import { generateDdl } from "../../../shared/utils/ddl-generator";
import { copyToClipboard } from "../../../shared/utils/clipboard";

vi.mock("../stores/useEditorStore");

vi.mock("../../../shared/utils/ddl-generator", () => ({
  generateDdl: vi.fn(),
}));

vi.mock("../../../shared/utils/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../shared/components/DarkCodeEditor", () => ({
  DarkCodeEditor: ({ value }: { value: string }) => (
    <pre data-testid="ddl-editor">{value}</pre>
  ),
}));

vi.mock("./ExportDdlModal.css", () => ({
  body: "",
  toolbar: "",
  filenameLabel: "",
  toolbarBtns: "",
  actionBtn: "",
  copySuccessBtn: "",
  emptyText: "",
}));

vi.mock("../../../design-system", () => ({
  Modal: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
  }) =>
    open ? (
      <div role="dialog">
        {title && <div>{title}</div>}
        {children}
      </div>
    ) : null,
}));

const mockDocument = { entities: [], relationships: [], layout: {} } as any;

describe("ExportDdlModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("open={false} — nothing rendered", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue("CREATE TABLE users (id INT);");

    const { container } = render(
      <ExportDdlModal open={false} diagramName="Test" onClose={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("open={true} + generateDdl returns DDL — shows filename and DDL in DarkCodeEditor", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue("CREATE TABLE users (id INT);");

    render(
      <ExportDdlModal open={true} diagramName="MyDiagram" onClose={vi.fn()} />
    );

    expect(screen.getByText("MyDiagram.sql")).toBeInTheDocument();
    expect(screen.getByTestId("ddl-editor")).toHaveTextContent(
      "CREATE TABLE users (id INT);"
    );
  });

  it("open={true} + document is null + generateDdl returns '' — shows empty message", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: null })
    );
    vi.mocked(generateDdl).mockReturnValue("");

    render(
      <ExportDdlModal open={true} diagramName="Empty" onClose={vi.fn()} />
    );

    expect(
      screen.getByText("테이블이 없습니다. 먼저 ERD를 작성해 주세요.")
    ).toBeInTheDocument();
  });

  it("copy button clicked — copyToClipboard called with the DDL", async () => {
    const ddl = "CREATE TABLE orders (id INT);";
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue(ddl);

    render(
      <ExportDdlModal open={true} diagramName="Orders" onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /복사/ }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(ddl);
    });
  });

  it("filename uses diagramName: 'My ERD' → filename is 'My_ERD.sql'", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue("CREATE TABLE t (id INT);");

    render(
      <ExportDdlModal open={true} diagramName="My ERD" onClose={vi.fn()} />
    );

    expect(screen.getByText("My_ERD.sql")).toBeInTheDocument();
  });
});

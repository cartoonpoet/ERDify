import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportModal } from "./ExportModal";
import { useEditorStore } from "@/store/useEditorStore";
import { generateDdl, generateOrm } from "@erdify/domain";
import { copyToClipboard } from "@/shared/utils/clipboard";

vi.mock("@/store/useEditorStore");

vi.mock("@erdify/domain", () => ({
  generateDdl: vi.fn(),
  generateOrm: vi.fn(),
}));

vi.mock("@/shared/utils/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/DarkCodeEditor", () => ({
  DarkCodeEditor: ({ value }: { value: string }) => (
    <pre data-testid="code-editor">{value}</pre>
  ),
}));

vi.mock("./ExportModal.css", () => ({
  body: "",
  tabRow: "",
  tab: "",
  tabActive: "",
  toolbar: "",
  filenameLabel: "",
  toolbarBtns: "",
  actionBtn: "",
  copySuccessBtn: "",
  emptyText: "",
}));

vi.mock("@/components/Modal", () => ({
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

describe("ExportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("open={false} — nothing rendered", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue("CREATE TABLE users (id INT);");

    const { container } = render(
      <ExportModal open={false} diagramName="Test" onClose={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("default tab is SQL — filename shown as '{diagramName}.sql'", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue("CREATE TABLE users (id INT);");

    render(<ExportModal open={true} diagramName="MyDiagram" onClose={vi.fn()} />);

    expect(screen.getByText("MyDiagram.sql")).toBeInTheDocument();
    expect(screen.getByTestId("code-editor")).toHaveTextContent("CREATE TABLE users (id INT);");
  });

  it("SQL filename normalizes special characters: 'My ERD' → 'My_ERD.sql'", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue("CREATE TABLE t (id INT);");

    render(<ExportModal open={true} diagramName="My ERD" onClose={vi.fn()} />);

    expect(screen.getByText("My_ERD.sql")).toBeInTheDocument();
  });

  it("clicking TypeORM tab → filename changes to 'schema.ts', generateOrm called with 'typeorm'", async () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue("CREATE TABLE t (id INT);");
    vi.mocked(generateOrm).mockReturnValue("// TypeORM code");

    render(<ExportModal open={true} diagramName="MyDiagram" onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "TypeORM" }));

    await waitFor(() => {
      expect(screen.getByText("schema.ts")).toBeInTheDocument();
    });
    expect(generateOrm).toHaveBeenCalledWith(mockDocument, "typeorm");
  });

  it("clicking Prisma tab → filename changes to 'schema.prisma'", async () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateOrm).mockReturnValue("// Prisma schema");

    render(<ExportModal open={true} diagramName="MyDiagram" onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Prisma" }));

    await waitFor(() => {
      expect(screen.getByText("schema.prisma")).toBeInTheDocument();
    });
  });

  it("clicking SQLAlchemy tab → filename changes to 'schema.py'", async () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateOrm).mockReturnValue("# SQLAlchemy code");

    render(<ExportModal open={true} diagramName="MyDiagram" onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "SQLAlchemy" }));

    await waitFor(() => {
      expect(screen.getByText("schema.py")).toBeInTheDocument();
    });
  });

  it("copy button calls copyToClipboard with current code", async () => {
    const ddl = "CREATE TABLE orders (id INT);";
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateDdl).mockReturnValue(ddl);

    render(<ExportModal open={true} diagramName="Orders" onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /복사/ }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(ddl);
    });
  });

  it("no document — shows empty message", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: null })
    );
    vi.mocked(generateDdl).mockReturnValue("");

    render(<ExportModal open={true} diagramName="Empty" onClose={vi.fn()} />);

    expect(
      screen.getByText("테이블이 없습니다. 먼저 ERD를 작성해 주세요.")
    ).toBeInTheDocument();
  });
});

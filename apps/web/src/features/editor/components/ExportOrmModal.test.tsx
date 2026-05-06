import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportOrmModal } from "./ExportOrmModal";
import { useEditorStore } from "../stores/useEditorStore";
import { generateOrm } from "@erdify/domain";
import { copyToClipboard } from "../../../shared/utils/clipboard";

vi.mock("../stores/useEditorStore");

vi.mock("@erdify/domain", () => ({
  generateOrm: vi.fn(),
}));

vi.mock("../../../shared/utils/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../shared/components/DarkCodeEditor", () => ({
  DarkCodeEditor: ({ value }: { value: string }) => (
    <pre data-testid="orm-editor">{value}</pre>
  ),
}));

vi.mock("./export-orm-modal.css", () => ({
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

vi.mock("../../../design-system/Modal", () => ({
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

describe("ExportOrmModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("default tab is TypeORM — 'TypeORM' tab text visible, filename shown as 'schema.ts'", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateOrm).mockReturnValue("// TypeORM code");

    render(<ExportOrmModal open={true} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "TypeORM" })).toBeInTheDocument();
    expect(screen.getByText("schema.ts")).toBeInTheDocument();
  });

  it("clicking 'Prisma' tab → filename changes to 'schema.prisma', generateOrm called with 'prisma'", async () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateOrm).mockReturnValue("// code");

    render(<ExportOrmModal open={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Prisma" }));

    await waitFor(() => {
      expect(screen.getByText("schema.prisma")).toBeInTheDocument();
    });

    expect(generateOrm).toHaveBeenCalledWith(mockDocument, "prisma");
  });

  it("clicking 'SQLAlchemy' tab → filename changes to 'schema.py'", async () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateOrm).mockReturnValue("# SQLAlchemy code");

    render(<ExportOrmModal open={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "SQLAlchemy" }));

    await waitFor(() => {
      expect(screen.getByText("schema.py")).toBeInTheDocument();
    });
  });

  it("copy button calls copyToClipboard with the code", async () => {
    const ormCode = "// TypeORM entity";
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: mockDocument })
    );
    vi.mocked(generateOrm).mockReturnValue(ormCode);

    render(<ExportOrmModal open={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /복사/ }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(ormCode);
    });
  });

  it("no document (selector returns null) — '테이블이 없습니다' shown", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({ document: null })
    );
    vi.mocked(generateOrm).mockReturnValue("");

    render(<ExportOrmModal open={true} onClose={vi.fn()} />);

    expect(screen.getByText("테이블이 없습니다")).toBeInTheDocument();
  });
});

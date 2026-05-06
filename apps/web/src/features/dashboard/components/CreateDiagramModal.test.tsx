import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateDiagramModal } from "./CreateDiagramModal";
import { createDiagram } from "../../../shared/api/diagrams.api";

vi.mock("../../../shared/api/diagrams.api", () => ({ createDiagram: vi.fn() }));
vi.mock("./modal-form.css", () => ({ form: "", footer: "", selectInput: "" }));

vi.mock("../../../design-system", () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div role="dialog">{title && <div>{title}</div>}{children}</div> : null,
  Button: ({ children, disabled, onClick, type, ...props }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: string; [k: string]: unknown }) =>
    <button type={type as "button" | "submit" | undefined} disabled={disabled} onClick={onClick}>{children}</button>,
  Input: ({ label, type, placeholder, value, onChange, error, required, autoFocus, id, ...props }: { label?: string; type?: string; placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; required?: boolean; autoFocus?: boolean; id?: string; [k: string]: unknown }) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} type={type ?? "text"} placeholder={placeholder} value={value} onChange={onChange} required={required} autoFocus={autoFocus} />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

const makeDiagramResponse = (id = "d-1") => ({
  id,
  projectId: "proj-1",
  organizationId: "org-1",
  name: "User Schema",
  content: {
    format: "erdify.schema.v1" as const,
    id: "doc-1",
    name: "User Schema",
    dialect: "postgresql" as const,
    entities: [],
    relationships: [],
    indexes: [] as [],
    views: [] as [],
    layout: { entityPositions: {} },
    metadata: { revision: 0, stableObjectIds: true as const, createdAt: "", updatedAt: "" },
  },
  createdBy: "u1",
  createdAt: "",
  updatedAt: "",
  myRole: "owner" as const,
  shareToken: null,
  shareExpiresAt: null,
});

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onCreated: vi.fn(),
  projectId: "proj-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreateDiagramModal", () => {
  it("open={false}일 때 렌더링되지 않는다", () => {
    render(<CreateDiagramModal open={false} onClose={vi.fn()} onCreated={vi.fn()} projectId="proj-1" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("open={true}일 때 dialog가 렌더링된다", () => {
    render(<CreateDiagramModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("submit 시 createDiagram이 projectId, name, 기본 dialect(postgresql)와 함께 호출된다", async () => {
    vi.mocked(createDiagram).mockResolvedValue(makeDiagramResponse());
    render(<CreateDiagramModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "User Schema" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(createDiagram).toHaveBeenCalledWith("proj-1", { name: "User Schema", dialect: "postgresql" });
    });
  });

  it("dialect를 mysql로 변경 후 submit 시 dialect: mysql과 함께 호출된다", async () => {
    vi.mocked(createDiagram).mockResolvedValue(makeDiagramResponse());
    render(<CreateDiagramModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My Schema" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "mysql" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(createDiagram).toHaveBeenCalledWith("proj-1", { name: "My Schema", dialect: "mysql" });
    });
  });

  it("성공 시 onCreated(diagram.id)와 onClose가 호출된다", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    vi.mocked(createDiagram).mockResolvedValue(makeDiagramResponse("d-42"));
    render(<CreateDiagramModal open={true} onClose={onClose} onCreated={onCreated} projectId="proj-1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "User Schema" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith("d-42");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("실패 시 에러 메시지가 표시된다", async () => {
    vi.mocked(createDiagram).mockRejectedValue(new Error("Server error"));
    render(<CreateDiagramModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "User Schema" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("ERD 생성에 실패했습니다.");
    });
  });

  it("이름이 비어있을 때 submit 버튼이 비활성화된다", () => {
    render(<CreateDiagramModal {...defaultProps} />);
    const submitBtn = screen.getByText("만들기");
    expect(submitBtn).toBeDisabled();
  });
});

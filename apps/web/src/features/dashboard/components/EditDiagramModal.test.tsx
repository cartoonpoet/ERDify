import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditDiagramModal } from "./EditDiagramModal";
import { updateDiagram } from "@/shared/api/diagrams.api";
import type { DiagramListItem } from "@/shared/api/diagrams.api";

vi.mock("@/shared/api/diagrams.api", () => ({ updateDiagram: vi.fn() }));
vi.mock("./modal-form.css", () => ({ form: "", footer: "", selectInput: "" }));

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
  Button: ({
    children,
    disabled,
    onClick,
    type
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: string;
    [k: string]: unknown;
  }) => (
    <button
      type={type as "button" | "submit" | undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  Input: ({
    label,
    type,
    placeholder,
    value,
    onChange,
    error,
    required,
    autoFocus,
    id
  }: {
    label?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    autoFocus?: boolean;
    id?: string;
    [k: string]: unknown;
  }) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        type={type ?? "text"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoFocus={autoFocus}
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

const createQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (ui: React.ReactElement, qc = createQc()) =>
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

const sampleDiagram: DiagramListItem = {
  id: "d-1",
  projectId: "proj-1",
  name: "My ERD",
  dialect: "postgresql",
  previewEntities: [],
  createdBy: "u-1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  shareToken: null,
  shareExpiresAt: null,
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  diagram: sampleDiagram,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditDiagramModal", () => {
  it("open={false}일 때 dialog가 렌더링되지 않는다", () => {
    wrap(<EditDiagramModal open={false} onClose={vi.fn()} diagram={sampleDiagram} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("open={true}일 때 dialog가 렌더링되며 제목이 표시된다", () => {
    wrap(<EditDiagramModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("ERD 수정")).toBeInTheDocument();
  });

  it("기존 diagram.name이 입력 필드에 미리 채워진다", () => {
    wrap(<EditDiagramModal {...defaultProps} />);
    expect(screen.getByDisplayValue("My ERD")).toBeInTheDocument();
  });

  it("기존 dialect가 select에 미리 선택된다", () => {
    wrap(<EditDiagramModal {...defaultProps} />);
    const select = screen.getByRole("combobox");
    expect((select as HTMLSelectElement).value).toBe("postgresql");
  });

  it("이름 입력 변경이 동작한다", () => {
    wrap(<EditDiagramModal {...defaultProps} />);
    const input = screen.getByDisplayValue("My ERD");
    fireEvent.change(input, { target: { value: "Updated ERD" } });
    expect(screen.getByDisplayValue("Updated ERD")).toBeInTheDocument();
  });

  it("dialect 변경이 동작한다", () => {
    wrap(<EditDiagramModal {...defaultProps} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "mysql" } });
    expect((select as HTMLSelectElement).value).toBe("mysql");
  });

  it("이름이 비어 있으면 저장 버튼이 비활성화된다", () => {
    wrap(<EditDiagramModal {...defaultProps} />);
    const input = screen.getByDisplayValue("My ERD");
    fireEvent.change(input, { target: { value: "" } });
    const saveBtn = screen.getByText("저장");
    expect(saveBtn).toBeDisabled();
  });

  it("이름과 dialect가 변경되지 않으면 updateDiagram이 호출되지 않고 onClose만 호출된다", async () => {
    const onClose = vi.fn();
    wrap(<EditDiagramModal open={true} onClose={onClose} diagram={sampleDiagram} />);
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(updateDiagram).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("이름이 변경되면 submit 시 updateDiagram이 올바른 인수로 호출된다", async () => {
    vi.mocked(updateDiagram).mockResolvedValue({} as Awaited<ReturnType<typeof updateDiagram>>);
    const onClose = vi.fn();
    wrap(<EditDiagramModal open={true} onClose={onClose} diagram={sampleDiagram} />);
    const input = screen.getByDisplayValue("My ERD");
    fireEvent.change(input, { target: { value: "Renamed ERD" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(updateDiagram).toHaveBeenCalledWith("d-1", {
        name: "Renamed ERD",
        dialect: "postgresql",
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("dialect가 변경되면 submit 시 updateDiagram이 새 dialect와 함께 호출된다", async () => {
    vi.mocked(updateDiagram).mockResolvedValue({} as Awaited<ReturnType<typeof updateDiagram>>);
    const onClose = vi.fn();
    wrap(<EditDiagramModal open={true} onClose={onClose} diagram={sampleDiagram} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "mysql" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(updateDiagram).toHaveBeenCalledWith("d-1", {
        name: "My ERD",
        dialect: "mysql",
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("API 실패 시 에러 메시지가 표시된다", async () => {
    vi.mocked(updateDiagram).mockRejectedValue(new Error("Server error"));
    wrap(<EditDiagramModal {...defaultProps} />);
    const input = screen.getByDisplayValue("My ERD");
    fireEvent.change(input, { target: { value: "Changed Name" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("저장에 실패했습니다.");
    });
  });

  it('"취소" 버튼 클릭 시 onClose가 호출된다', () => {
    const onClose = vi.fn();
    wrap(<EditDiagramModal open={true} onClose={onClose} diagram={sampleDiagram} />);
    fireEvent.click(screen.getByText("취소"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("이름 공백 trim 후 비어있으면 submit이 실행되지 않는다", async () => {
    const onClose = vi.fn();
    wrap(<EditDiagramModal open={true} onClose={onClose} diagram={sampleDiagram} />);
    const input = screen.getByDisplayValue("My ERD");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(updateDiagram).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

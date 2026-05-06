import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateProjectModal } from "./CreateProjectModal";
import { createProject } from "../../../shared/api/projects.api";

vi.mock("../../../shared/api/projects.api", () => ({ createProject: vi.fn() }));
vi.mock("./modal-form.css", () => ({ form: "", footer: "" }));

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

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onCreated: vi.fn(),
  orgId: "org-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreateProjectModal", () => {
  it("open={false}일 때 렌더링되지 않는다", () => {
    render(<CreateProjectModal open={false} onClose={vi.fn()} onCreated={vi.fn()} orgId="org-1" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("open={true}일 때 dialog가 렌더링된다", () => {
    render(<CreateProjectModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("submit 시 createProject가 orgId와 trimmed name과 함께 호출된다", async () => {
    vi.mocked(createProject).mockResolvedValue({
      id: "p-1", organizationId: "org-1", name: "Backend API",
      description: null, createdAt: "", updatedAt: "",
    });
    render(<CreateProjectModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Backend API  " } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith("org-1", { name: "Backend API" });
    });
  });

  it("성공 시 onCreated와 onClose가 호출된다", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    vi.mocked(createProject).mockResolvedValue({
      id: "p-1", organizationId: "org-1", name: "Backend API",
      description: null, createdAt: "", updatedAt: "",
    });
    render(<CreateProjectModal open={true} onClose={onClose} onCreated={onCreated} orgId="org-1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Backend API" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("실패 시 에러 메시지가 표시된다", async () => {
    vi.mocked(createProject).mockRejectedValue(new Error("Server error"));
    render(<CreateProjectModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Backend API" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("프로젝트 생성에 실패했습니다.");
    });
  });

  it("이름이 비어있을 때 submit 버튼이 비활성화된다", () => {
    render(<CreateProjectModal {...defaultProps} />);
    const submitBtn = screen.getByText("만들기");
    expect(submitBtn).toBeDisabled();
  });
});

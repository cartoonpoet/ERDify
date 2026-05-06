import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateOrgModal } from "./CreateOrgModal";
import { createOrganization } from "../../../shared/api/organizations.api";

vi.mock("../../../shared/api/organizations.api", () => ({ createOrganization: vi.fn() }));
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
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreateOrgModal", () => {
  it("open={false}일 때 렌더링되지 않는다", () => {
    render(<CreateOrgModal open={false} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("open={true}일 때 dialog가 렌더링된다", () => {
    render(<CreateOrgModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("submit 시 createOrganization이 trimmed name과 함께 호출된다", async () => {
    vi.mocked(createOrganization).mockResolvedValue({
      id: "org-1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "",
    });
    render(<CreateOrgModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Acme Corp  " } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(createOrganization).toHaveBeenCalledWith({ name: "Acme Corp" });
    });
  });

  it("성공 시 onCreated와 onClose가 호출된다", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    vi.mocked(createOrganization).mockResolvedValue({
      id: "org-1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "",
    });
    render(<CreateOrgModal open={true} onClose={onClose} onCreated={onCreated} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Acme Corp" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("실패 시 에러 메시지가 표시된다", async () => {
    vi.mocked(createOrganization).mockRejectedValue(new Error("Server error"));
    render(<CreateOrgModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Acme Corp" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("조직 생성에 실패했습니다.");
    });
  });

  it("이름이 비어있을 때 submit 버튼이 비활성화된다", () => {
    render(<CreateOrgModal {...defaultProps} />);
    const submitBtn = screen.getByText("만들기");
    expect(submitBtn).toBeDisabled();
  });
});

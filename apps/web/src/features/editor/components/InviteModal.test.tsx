import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InviteModal } from "./InviteModal";
import * as orgApi from "../../../shared/api/organizations.api";

vi.mock("../../../shared/api/organizations.api", () => ({
  inviteMemberByEmail: vi.fn(),
}));
vi.mock("../../../design-system/Modal", () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div role="dialog">{title && <div>{title}</div>}{children}</div> : null,
}));
vi.mock("./invite-modal.css", () => ({
  body: "",
  field: "",
  fieldLabel: "",
  textInput: "",
  roleSelect: "",
  footer: "",
  cancelBtn: "",
  submitBtn: "",
  errorText: "",
  successContainer: "",
  successIcon: "",
  successText: "",
  successCloseBtn: "",
}));

describe("InviteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    render(<InviteModal open={false} onClose={vi.fn()} organizationId="org-1" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows email input and role select when open is true", () => {
    render(<InviteModal open={true} onClose={vi.fn()} organizationId="org-1" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("권한")).toBeInTheDocument();
  });

  it("submits form and shows success message", async () => {
    vi.mocked(orgApi.inviteMemberByEmail).mockResolvedValue(undefined);
    render(<InviteModal open={true} onClose={vi.fn()} organizationId="org-1" />);
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "user@test.com" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() =>
      expect(screen.getByText(/님을 초대했습니다/)).toBeInTheDocument()
    );
    expect(orgApi.inviteMemberByEmail).toHaveBeenCalledWith("org-1", "user@test.com", "editor");
  });

  it("shows error text when inviteMemberByEmail rejects", async () => {
    vi.mocked(orgApi.inviteMemberByEmail).mockRejectedValue(new Error("이미 초대된 사용자입니다"));
    render(<InviteModal open={true} onClose={vi.fn()} organizationId="org-1" />);
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "fail@test.com" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() =>
      expect(screen.getByText("이미 초대된 사용자입니다")).toBeInTheDocument()
    );
  });
});

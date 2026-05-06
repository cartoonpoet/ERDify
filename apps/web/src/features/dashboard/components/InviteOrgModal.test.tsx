import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InviteOrgModal } from "./InviteOrgModal";

vi.mock("../hooks/useInvites", () => ({
  useInvites: vi.fn(),
}));
import { useInvites } from "../hooks/useInvites";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe("InviteOrgModal", () => {
  it("renders invite form when open", () => {
    vi.mocked(useInvites).mockReturnValue({
      invites: [], isLoading: false,
      invite: vi.fn(), cancelInvite: vi.fn(), isInviting: false,
    });
    render(<InviteOrgModal open orgId="org-1" onClose={vi.fn()} />, { wrapper });
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초대 보내기" })).toBeInTheDocument();
  });

  it("calls invite and shows success result", async () => {
    const invite = vi.fn().mockResolvedValue({ status: "added" });
    vi.mocked(useInvites).mockReturnValue({
      invites: [], isLoading: false,
      invite, cancelInvite: vi.fn(), isInviting: false,
    });
    render(<InviteOrgModal open orgId="org-1" onClose={vi.fn()} />, { wrapper });
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "초대 보내기" }));
    await waitFor(() => expect(invite).toHaveBeenCalledWith("a@b.com", "editor"));
    await waitFor(() => expect(screen.getByText("멤버로 추가되었습니다.")).toBeInTheDocument());
  });

  it("calls invite and shows pending result", async () => {
    const invite = vi.fn().mockResolvedValue({ status: "pending" });
    vi.mocked(useInvites).mockReturnValue({
      invites: [], isLoading: false,
      invite, cancelInvite: vi.fn(), isInviting: false,
    });
    render(<InviteOrgModal open orgId="org-1" onClose={vi.fn()} />, { wrapper });
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "new@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "초대 보내기" }));
    await waitFor(() => expect(screen.getByText("가입 초대 메일을 보냈습니다.")).toBeInTheDocument());
  });
});

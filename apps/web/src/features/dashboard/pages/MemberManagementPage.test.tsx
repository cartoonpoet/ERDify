import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemberManagementPage } from "./MemberManagementPage";

vi.mock("@/shared/api/auth.api", () => ({ getMe: vi.fn() }));
vi.mock("@/shared/api/organizations.api", () => ({ listMyOrganizations: vi.fn() }));
vi.mock("../hooks/useMembers", () => ({ useMembers: vi.fn() }));
vi.mock("../hooks/useInvites", () => ({ useInvites: vi.fn() }));
vi.mock("../components/InviteOrgModal", () => ({ InviteOrgModal: () => null }));

import { getMe } from "@/shared/api/auth.api";
import { listMyOrganizations } from "@/shared/api/organizations.api";
import { useMembers } from "@/features/dashboard/hooks/useMembers";
import { useInvites } from "@/features/dashboard/hooks/useInvites";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (orgId = "org-1") =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[`/${orgId}/members`]}>
        <Routes>
          <Route path="/:orgId/members" element={<MemberManagementPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("MemberManagementPage", () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue({ id: "u1", email: "a@b.com", name: "Test User", phone: null, avatarUrl: null, isAdmin: false });
    vi.mocked(listMyOrganizations).mockResolvedValue([
      { id: "org-1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "" },
    ]);
    vi.mocked(useMembers).mockReturnValue({
      members: [{ userId: "u1", email: "a@b.com", name: "Test User", role: "owner", joinedAt: "" }],
      isLoading: false,
      updateRole: vi.fn(),
      removeMember: vi.fn(),
    });
    vi.mocked(useInvites).mockReturnValue({
      invites: [],
      isLoading: false,
      invite: vi.fn(),
      cancelInvite: vi.fn(),
      isInviting: false,
    });
  });

  it.each([
    ["URL의 orgId로 org 이름을 렌더링한다", "Acme Corp"],
    ["멤버 이메일을 렌더링한다", "a@b.com"],
    ["'멤버 관리' 제목을 렌더링한다", "멤버 관리"],
  ])("%s", async (_description, text) => {
    wrap();
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  describe("멤버 내보내기", () => {
    beforeEach(() => {
      vi.mocked(useMembers).mockReturnValue({
        members: [
          { userId: "u1", email: "a@b.com", name: "Test User", role: "owner", joinedAt: "" },
          { userId: "u2", email: "b@b.com", name: "Other User", role: "editor", joinedAt: "" },
        ],
        isLoading: false,
        updateRole: vi.fn(),
        removeMember: vi.fn(),
      });
    });

    it("다른 멤버에게 내보내기 버튼이 표시된다", async () => {
      wrap();
      expect(await screen.findByRole("button", { name: "내보내기" })).toBeInTheDocument();
    });

    it("confirm 승인 시 removeMember가 호출된다", async () => {
      const removeMember = vi.fn();
      vi.mocked(useMembers).mockReturnValue({
        members: [
          { userId: "u1", email: "a@b.com", name: "Test User", role: "owner", joinedAt: "" },
          { userId: "u2", email: "b@b.com", name: "Other User", role: "editor", joinedAt: "" },
        ],
        isLoading: false,
        updateRole: vi.fn(),
        removeMember,
      });
      vi.spyOn(window, "confirm").mockReturnValue(true);
      wrap();
      fireEvent.click(await screen.findByRole("button", { name: "내보내기" }));
      await waitFor(() => expect(removeMember).toHaveBeenCalledWith("u2"));
      vi.restoreAllMocks();
    });

    it("confirm 취소 시 removeMember가 호출되지 않는다", async () => {
      const removeMember = vi.fn();
      vi.mocked(useMembers).mockReturnValue({
        members: [
          { userId: "u1", email: "a@b.com", name: "Test User", role: "owner", joinedAt: "" },
          { userId: "u2", email: "b@b.com", name: "Other User", role: "editor", joinedAt: "" },
        ],
        isLoading: false,
        updateRole: vi.fn(),
        removeMember,
      });
      vi.spyOn(window, "confirm").mockReturnValue(false);
      wrap();
      fireEvent.click(await screen.findByRole("button", { name: "내보내기" }));
      expect(removeMember).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});

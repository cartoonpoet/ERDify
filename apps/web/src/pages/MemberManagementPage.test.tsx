import { render, screen } from "@testing-library/react";
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
import { useMembers } from "@/hooks/useMembers";
import { useInvites } from "@/hooks/useInvites";

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
    vi.mocked(getMe).mockResolvedValue({ id: "u1", email: "a@b.com", name: "Test User", phone: null, avatarUrl: null });
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

  it("URL의 orgId로 org 이름을 렌더링한다", async () => {
    wrap();
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
  });

  it("멤버 이메일을 렌더링한다", async () => {
    wrap();
    expect(await screen.findByText("a@b.com")).toBeInTheDocument();
  });

  it("'멤버 관리' 제목을 렌더링한다", async () => {
    wrap();
    expect(await screen.findByText("멤버 관리")).toBeInTheDocument();
  });
});

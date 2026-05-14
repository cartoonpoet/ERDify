import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RootRedirect } from "./RootRedirect";

vi.mock("@/shared/api/organizations.api", () => ({
  listMyOrganizations: vi.fn(),
}));

const mockOpenModal = vi.fn();
vi.mock("@/features/dashboard/store/useDashboardStore", () => ({
  useDashboardStore: (selector: (s: { openModal: typeof mockOpenModal }) => unknown) =>
    selector({ openModal: mockOpenModal }),
}));

import { listMyOrganizations } from "@/shared/api/organizations.api";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (initialPath = "/") =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/:orgId" element={<div>org page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("RootRedirect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("orgs가 있으면 첫 번째 org 경로로 리다이렉트한다", async () => {
    vi.mocked(listMyOrganizations).mockResolvedValue([
      { id: "org-1", name: "Acme", ownerId: "u1", createdAt: "", updatedAt: "" },
    ]);
    wrap();
    expect(await screen.findByText("org page")).toBeInTheDocument();
  });

  it("orgs가 없으면 org 생성 모달을 연다", async () => {
    vi.mocked(listMyOrganizations).mockResolvedValue([]);
    wrap();
    await screen.findByText("org page").catch(() => null); // let async settle
    // waitFor openModal to be called
    await vi.waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalledWith("org");
    });
  });

  it("로딩 중에는 아무것도 렌더링하지 않는다", () => {
    vi.mocked(listMyOrganizations).mockReturnValue(new Promise(() => {}));
    const { container } = wrap();
    expect(container.firstChild).toBeNull();
  });
});

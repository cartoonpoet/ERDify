import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RootRedirect } from "./RootRedirect";

vi.mock("@/api/organizations.api", () => ({
  listMyOrganizations: vi.fn(),
}));
vi.mock("../components/CreateOrgModal", () => ({
  CreateOrgModal: () => null,
}));

import { listMyOrganizations } from "@/api/organizations.api";

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
  it("orgs가 있으면 첫 번째 org 경로로 리다이렉트한다", async () => {
    vi.mocked(listMyOrganizations).mockResolvedValue([
      { id: "org-1", name: "Acme", ownerId: "u1", createdAt: "", updatedAt: "" },
    ]);
    wrap();
    expect(await screen.findByText("org page")).toBeInTheDocument();
  });

  it("orgs가 없으면 '새 조직 만들기' 버튼을 표시한다", async () => {
    vi.mocked(listMyOrganizations).mockResolvedValue([]);
    wrap();
    expect(await screen.findByText("+ 새 조직 만들기")).toBeInTheDocument();
  });

  it("로딩 중에는 아무것도 렌더링하지 않는다", () => {
    vi.mocked(listMyOrganizations).mockReturnValue(new Promise(() => {}));
    const { container } = wrap();
    expect(container.firstChild).toBeNull();
  });
});

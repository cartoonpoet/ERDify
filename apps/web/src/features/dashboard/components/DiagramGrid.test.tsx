import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DiagramGrid } from "./DiagramGrid";
import type { DiagramListItem } from "@/shared/api/diagrams.api";
import type { DashboardOutletContext } from "../pages/DashboardPage";

vi.mock("@/shared/api/diagrams.api", () => ({
  listDiagrams: vi.fn(),
}));
vi.mock("@/shared/api/projects.api", () => ({
  listProjects: vi.fn(),
}));
vi.mock("@/shared/api/auth.api", () => ({
  getMe: vi.fn(),
}));
vi.mock("@/shared/components/ShareDiagramModal", () => ({
  ShareDiagramModal: () => null,
}));

import { listDiagrams } from "@/shared/api/diagrams.api";
import { listProjects } from "@/shared/api/projects.api";
import { getMe } from "@/shared/api/auth.api";

const diagrams: DiagramListItem[] = [
  {
    id: "d1", projectId: "p1", name: "User Schema",
    dialect: "postgresql", previewEntities: [],
    createdBy: "user-1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    shareToken: null, shareExpiresAt: null,
  },
  {
    id: "d2", projectId: "p1", name: "Order Schema",
    dialect: "mysql", previewEntities: [],
    createdBy: "user-2",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    shareToken: null, shareExpiresAt: null,
  },
];

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

interface WrapOptions {
  outletCtx?: Partial<DashboardOutletContext>;
  orgId?: string;
  projectId?: string;
  noProject?: boolean;
}

const ParentWithOutlet = ({ ctx }: { ctx: DashboardOutletContext }) => (
  <Outlet context={ctx} />
);

const wrap = (opts: WrapOptions = {}) => {
  const {
    outletCtx = {},
    orgId = "org-1",
    projectId: _pid = "p1",
    noProject = false,
  } = opts;
  const projectId = noProject ? undefined : _pid;

  const ctx: DashboardOutletContext = {
    onCreateDiagram: vi.fn(),
    onImportDiagram: vi.fn(),
    onDeleteDiagram: vi.fn(),
    searchQuery: "",
    onSearchChange: vi.fn(),
    ...outletCtx,
  };

  const qc = makeQueryClient();
  const path = projectId
    ? `/${orgId}/${projectId}`
    : `/${orgId}`;
  const routePattern = projectId
    ? "/:orgId/:projectId"
    : "/:orgId";

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ParentWithOutlet ctx={ctx} />}>
            <Route path={routePattern} element={<DiagramGrid />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("DiagramGrid", () => {
  beforeEach(() => {
    vi.mocked(listDiagrams).mockResolvedValue(diagrams);
    vi.mocked(listProjects).mockResolvedValue([
      { id: "p1", name: "Test Project", organizationId: "org-1", description: null, createdAt: "", updatedAt: "" },
    ]);
    vi.mocked(getMe).mockResolvedValue({
      id: "user-1", email: "test@test.com", name: "Test User", phone: null, avatarUrl: null, isAdmin: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("다이어그램 이름들을 렌더링한다", async () => {
    wrap();
    expect(await screen.findByText("User Schema")).toBeInTheDocument();
    expect(screen.getByText("Order Schema")).toBeInTheDocument();
  });

  it("'새 ERD 만들기' 카드를 렌더링한다", async () => {
    wrap();
    expect(await screen.findByText("새 ERD 만들기")).toBeInTheDocument();
  });

  it("'새 ERD 만들기' 클릭 시 onCreateDiagram이 호출된다", async () => {
    const onCreateDiagram = vi.fn();
    wrap({ outletCtx: { onCreateDiagram } });
    const btn = await screen.findByText("새 ERD 만들기");
    fireEvent.click(btn);
    expect(onCreateDiagram).toHaveBeenCalledTimes(1);
  });

  it("로딩 상태에서 Skeleton을 렌더링한다", () => {
    vi.mocked(listDiagrams).mockReturnValue(new Promise(() => {})); // never resolves
    wrap();
    expect(document.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(0);
  });

  it("searchQuery가 있으면 이름에 해당 문자열이 포함된 다이어그램만 렌더링한다", async () => {
    wrap({ outletCtx: { searchQuery: "User" } });
    expect(await screen.findByText("User Schema")).toBeInTheDocument();
    expect(screen.queryByText("Order Schema")).not.toBeInTheDocument();
  });

  it("projectId가 없으면 '프로젝트를 선택하세요'를 렌더링한다", async () => {
    wrap({ noProject: true });
    expect(await screen.findByText("프로젝트를 선택하세요")).toBeInTheDocument();
  });

  describe("에러 상태", () => {
    it("diagrams 쿼리 실패 시 에러 UI를 렌더링한다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 500 } });
      wrap();
      expect(await screen.findByText("서버 오류")).toBeInTheDocument();
    });

    it("5xx 에러 시 '다시 시도' 버튼을 렌더링한다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 500 } });
      wrap();
      expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    });

    it("403 에러 시 '다시 시도' 버튼을 렌더링하지 않는다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 403 } });
      wrap();
      expect(await screen.findByText("접근 권한이 없습니다")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
    });

    it("403 에러 시 '가져오기'/'새 ERD' 버튼이 disabled 된다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 403 } });
      wrap();
      await screen.findByText("접근 권한이 없습니다");
      const importBtn = screen.queryByRole("button", { name: "가져오기" });
      const newBtn = screen.queryByRole("button", { name: /새 ERD/ });
      if (importBtn) expect(importBtn).toBeDisabled();
      if (newBtn) expect(newBtn).toBeDisabled();
    });

    it("에러 상태에서 프로젝트 이름은 계속 표시된다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 500 } });
      wrap();
      await screen.findByText("서버 오류");
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });
  });
});

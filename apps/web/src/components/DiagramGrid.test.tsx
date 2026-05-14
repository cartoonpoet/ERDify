import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DiagramGrid } from "./DiagramGrid";
import type { DiagramResponse } from "@/shared/api/diagrams.api";
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
vi.mock("../../editor/components/ShareDiagramModal", () => ({
  ShareDiagramModal: () => null,
}));

import { listDiagrams } from "@/shared/api/diagrams.api";
import { listProjects } from "@/shared/api/projects.api";
import { getMe } from "@/shared/api/auth.api";

const makeContent = (dialect: "postgresql" | "mysql") => ({
  format: "erdify.schema.v1" as const,
  id: "doc-1",
  name: "test",
  dialect,
  entities: [],
  relationships: [],
  indexes: [] as [],
  views: [] as [],
  layout: { entityPositions: {} },
  metadata: { revision: 0, stableObjectIds: true as const, createdAt: "", updatedAt: "" },
});

const diagrams: DiagramResponse[] = [
  {
    id: "d1", projectId: "p1", organizationId: "org-1", organizationName: "Test Org", projectName: "Test Project", name: "User Schema",
    content: makeContent("postgresql"), createdBy: "user-1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), myRole: "editor" as const,
    shareToken: null, shareExpiresAt: null,
  },
  {
    id: "d2", projectId: "p1", organizationId: "org-1", organizationName: "Test Org", projectName: "Test Project", name: "Order Schema",
    content: makeContent("mysql"), createdBy: "user-2",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), myRole: "editor" as const,
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
      id: "user-1", email: "test@test.com", name: "Test User", phone: null, avatarUrl: null,
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
});

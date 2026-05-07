import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnifiedSidebar } from "./UnifiedSidebar";
import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../../shared/api/organizations.api", () => ({
  listMyOrganizations: vi.fn(),
}));
vi.mock("../../../shared/api/projects.api", () => ({
  listProjects: vi.fn(),
}));
vi.mock("../../../shared/api/diagrams.api", () => ({
  listDiagrams: vi.fn(),
}));

import { listMyOrganizations } from "../../../shared/api/organizations.api";
import { listProjects } from "../../../shared/api/projects.api";
import { listDiagrams } from "../../../shared/api/diagrams.api";

const orgs: OrgResponse[] = [
  { id: "org-1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "" },
  { id: "org-2", name: "My Team", ownerId: "u1", createdAt: "", updatedAt: "" },
];

const projects: ProjectResponse[] = [
  { id: "p1", organizationId: "org-1", name: "Backend API", description: null, createdAt: "", updatedAt: "" },
  { id: "p2", organizationId: "org-1", name: "Auth Service", description: null, createdAt: "", updatedAt: "" },
];

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
    id: "d1", projectId: "p1", organizationId: "org-1", name: "사용자 스키마",
    content: makeContent("postgresql"), createdBy: "u1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), myRole: "editor" as const,
    shareToken: null, shareExpiresAt: null,
  },
];

const defaultProps = {
  onDeleteOrg: vi.fn(),
  onCreateOrg: vi.fn(),
  onDeleteProject: vi.fn(),
  onCreateProject: vi.fn(),
  onCreateDiagram: vi.fn(),
};

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

/**
 * Renders UnifiedSidebar inside a route that provides :orgId and :projectId params.
 * initialPath: the URL to start at (e.g. "/org-1", "/org-1/p1").
 */
const wrap = (
  ui: React.ReactElement,
  {
    initialPath = "/",
    routePattern = "/:orgId?/:projectId?",
  }: { initialPath?: string; routePattern?: string } = {},
) => {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={routePattern} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("UnifiedSidebar", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(listMyOrganizations).mockResolvedValue(orgs);
    vi.mocked(listProjects).mockResolvedValue(projects);
    vi.mocked(listDiagrams).mockResolvedValue(diagrams);
  });

  it("선택된 조직 이름을 렌더링한다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/org-1" });
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
  });

  it("조직이 선택되지 않으면 프로젝트 트리를 렌더링하지 않는다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/" });
    expect(await screen.findByText("조직을 선택하세요")).toBeInTheDocument();
    expect(screen.queryByText("Backend API")).not.toBeInTheDocument();
  });

  it("조직 셀렉터 클릭 시 드롭다운이 열린다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/org-1" });
    const selectorBtn = (await screen.findByText("Acme Corp")).closest("button")!;
    fireEvent.click(selectorBtn);
    expect(screen.getByText("My Team")).toBeInTheDocument();
  });

  it("드롭다운에서 조직 클릭 시 navigate가 호출된다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/org-1" });
    fireEvent.click((await screen.findByText("Acme Corp")).closest("button")!);
    fireEvent.click(screen.getByText("My Team").closest("button")!);
    expect(mockNavigate).toHaveBeenCalledWith("/org-2");
  });

  it("드롭다운 '+ 새 조직 만들기' 클릭 시 onCreateOrg가 호출된다", async () => {
    const onCreateOrg = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onCreateOrg={onCreateOrg} />, { initialPath: "/org-1" });
    fireEvent.click((await screen.findByText("Acme Corp")).closest("button")!);
    fireEvent.click(screen.getByText("+ 새 조직 만들기"));
    expect(onCreateOrg).toHaveBeenCalledTimes(1);
  });

  it("조직이 선택되면 프로젝트 목록을 렌더링한다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/org-1" });
    expect(await screen.findByText("Backend API")).toBeInTheDocument();
    expect(screen.getByText("Auth Service")).toBeInTheDocument();
  });

  it("프로젝트 클릭 시 navigate가 호출된다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/org-1" });
    fireEvent.click((await screen.findByText("Backend API")).closest("button")!);
    expect(mockNavigate).toHaveBeenCalledWith("/org-1/p1");
  });

  it("선택된 프로젝트가 있으면 ERD 목록을 렌더링한다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, {
      initialPath: "/org-1/p1",
      routePattern: "/:orgId/:projectId",
    });
    expect(await screen.findByText("사용자 스키마")).toBeInTheDocument();
  });

  it("ERD 항목 클릭 시 해당 다이어그램 경로로 navigate가 호출된다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, {
      initialPath: "/org-1/p1",
      routePattern: "/:orgId/:projectId",
    });
    fireEvent.click((await screen.findByText("사용자 스키마")).closest("button")!);
    expect(mockNavigate).toHaveBeenCalledWith("/diagrams/d1");
  });

  it("펼쳐진 프로젝트에 '+ 새 ERD 만들기' 버튼이 표시된다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, {
      initialPath: "/org-1/p1",
      routePattern: "/:orgId/:projectId",
    });
    expect(await screen.findByText("+ 새 ERD 만들기")).toBeInTheDocument();
  });

  it("'+ 새 ERD 만들기' 클릭 시 onCreateDiagram이 호출된다", async () => {
    const onCreateDiagram = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onCreateDiagram={onCreateDiagram} />, {
      initialPath: "/org-1/p1",
      routePattern: "/:orgId/:projectId",
    });
    fireEvent.click(await screen.findByText("+ 새 ERD 만들기"));
    expect(onCreateDiagram).toHaveBeenCalledTimes(1);
  });

  it("'+ 새 프로젝트' 클릭 시 onCreateProject가 호출된다", async () => {
    const onCreateProject = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onCreateProject={onCreateProject} />, { initialPath: "/org-1" });
    fireEvent.click(await screen.findByText("+ 새 프로젝트"));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });

  it("프로젝트 삭제 버튼 클릭 후 확인 시 onDeleteProject가 호출된다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDeleteProject = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onDeleteProject={onDeleteProject} />, { initialPath: "/org-1" });
    fireEvent.click(await screen.findByRole("button", { name: "Backend API 삭제" }));
    expect(onDeleteProject).toHaveBeenCalledWith("p1");
    vi.restoreAllMocks();
  });

  it("프로젝트 삭제 버튼 클릭 후 취소 시 onDeleteProject가 호출되지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDeleteProject = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onDeleteProject={onDeleteProject} />, { initialPath: "/org-1" });
    fireEvent.click(await screen.findByRole("button", { name: "Backend API 삭제" }));
    expect(onDeleteProject).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("조직 선택 후 드롭다운이 닫힌다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/org-1" });
    fireEvent.click((await screen.findByText("Acme Corp")).closest("button")!);
    expect(screen.getByText("My Team")).toBeInTheDocument();
    fireEvent.click(screen.getByText("My Team").closest("button")!);
    expect(screen.queryByText("My Team")).not.toBeInTheDocument();
  });

  it("API 키 버튼은 조직 미선택 상태에서도 렌더링된다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/" });
    expect(await screen.findByText("API 키")).toBeInTheDocument();
  });

  it("API 키 버튼 클릭 시 조직이 없으면 navigate가 호출되지 않는다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/" });
    fireEvent.click((await screen.findByText("API 키")).closest("button")!);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("API 키 버튼 클릭 시 조직이 있으면 api-keys 경로로 navigate가 호출된다", async () => {
    wrap(<UnifiedSidebar {...defaultProps} />, { initialPath: "/org-1" });
    await screen.findByText("Acme Corp"); // wait for orgs to load
    fireEvent.click(screen.getByText("API 키").closest("button")!);
    expect(mockNavigate).toHaveBeenCalledWith("/org-1/api-keys");
  });
});

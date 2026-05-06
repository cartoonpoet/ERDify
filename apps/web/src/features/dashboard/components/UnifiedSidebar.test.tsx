import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UnifiedSidebar } from "./UnifiedSidebar";
import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

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
  orgs,
  selectedOrgId: "org-1",
  onSelectOrg: vi.fn(),
  onDeleteOrg: vi.fn(),
  onCreateOrg: vi.fn(),
  projects,
  selectedProjectId: null,
  onSelectProject: vi.fn(),
  onDeleteProject: vi.fn(),
  onCreateProject: vi.fn(),
  diagrams: [],
  onCreateDiagram: vi.fn(),
};

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("UnifiedSidebar", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("선택된 조직 이름을 렌더링한다", () => {
    wrap(<UnifiedSidebar {...defaultProps} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("조직이 선택되지 않으면 프로젝트 트리를 렌더링하지 않는다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedOrgId={null} />);
    expect(screen.queryByText("Backend API")).not.toBeInTheDocument();
  });

  it("조직 셀렉터 클릭 시 드롭다운이 열린다", () => {
    wrap(<UnifiedSidebar {...defaultProps} />);
    const selectorBtn = screen.getByText("Acme Corp").closest("button")!;
    fireEvent.click(selectorBtn);
    expect(screen.getByText("My Team")).toBeInTheDocument();
  });

  it("드롭다운에서 조직 클릭 시 onSelectOrg가 호출된다", () => {
    const onSelectOrg = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onSelectOrg={onSelectOrg} />);
    fireEvent.click(screen.getByText("Acme Corp").closest("button")!);
    fireEvent.click(screen.getByText("My Team").closest("button")!);
    expect(onSelectOrg).toHaveBeenCalledWith("org-2");
  });

  it("드롭다운 '+ 새 조직 만들기' 클릭 시 onCreateOrg가 호출된다", () => {
    const onCreateOrg = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onCreateOrg={onCreateOrg} />);
    fireEvent.click(screen.getByText("Acme Corp").closest("button")!);
    fireEvent.click(screen.getByText("+ 새 조직 만들기"));
    expect(onCreateOrg).toHaveBeenCalledTimes(1);
  });

  it("조직이 선택되면 프로젝트 목록을 렌더링한다", () => {
    wrap(<UnifiedSidebar {...defaultProps} />);
    expect(screen.getByText("Backend API")).toBeInTheDocument();
    expect(screen.getByText("Auth Service")).toBeInTheDocument();
  });

  it("프로젝트 클릭 시 onSelectProject가 호출된다", () => {
    const onSelectProject = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onSelectProject={onSelectProject} />);
    fireEvent.click(screen.getByText("Backend API").closest("button")!);
    expect(onSelectProject).toHaveBeenCalledWith("p1");
  });

  it("선택된 프로젝트가 있으면 ERD 목록을 렌더링한다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedProjectId="p1" diagrams={diagrams} />);
    expect(screen.getByText("사용자 스키마")).toBeInTheDocument();
  });

  it("ERD 항목 클릭 시 해당 다이어그램 경로로 navigate가 호출된다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedProjectId="p1" diagrams={diagrams} />);
    fireEvent.click(screen.getByText("사용자 스키마").closest("button")!);
    expect(mockNavigate).toHaveBeenCalledWith("/diagrams/d1");
  });

  it("펼쳐진 프로젝트에 '+ 새 ERD 만들기' 버튼이 표시된다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedProjectId="p1" diagrams={diagrams} />);
    expect(screen.getByText("+ 새 ERD 만들기")).toBeInTheDocument();
  });

  it("'+ 새 ERD 만들기' 클릭 시 onCreateDiagram이 호출된다", () => {
    const onCreateDiagram = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} selectedProjectId="p1" diagrams={diagrams} onCreateDiagram={onCreateDiagram} />);
    fireEvent.click(screen.getByText("+ 새 ERD 만들기"));
    expect(onCreateDiagram).toHaveBeenCalledTimes(1);
  });

  it("'+ 새 프로젝트' 클릭 시 onCreateProject가 호출된다", () => {
    const onCreateProject = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onCreateProject={onCreateProject} />);
    fireEvent.click(screen.getByText("+ 새 프로젝트"));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });
});

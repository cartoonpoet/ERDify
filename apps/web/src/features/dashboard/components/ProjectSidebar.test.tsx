import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectSidebar } from "./ProjectSidebar";
import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";

const org: OrgResponse = { id: "org-1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "" };
const projects: ProjectResponse[] = [
  { id: "p1", organizationId: "org-1", name: "Backend API", description: null, createdAt: "", updatedAt: "" },
  { id: "p2", organizationId: "org-1", name: "Frontend", description: null, createdAt: "", updatedAt: "" },
];

describe("ProjectSidebar", () => {
  it("조직 이름을 렌더링한다", () => {
    render(<ProjectSidebar org={org} projects={projects} selectedProjectId={null} onSelect={vi.fn()} onCreateProject={vi.fn()} onDeleteProject={vi.fn()} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("프로젝트 목록을 렌더링한다", () => {
    render(<ProjectSidebar org={org} projects={projects} selectedProjectId={null} onSelect={vi.fn()} onCreateProject={vi.fn()} onDeleteProject={vi.fn()} />);
    expect(screen.getByText("Backend API")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("프로젝트 클릭 시 onSelect가 해당 id로 호출된다", () => {
    const onSelect = vi.fn();
    render(<ProjectSidebar org={org} projects={projects} selectedProjectId={null} onSelect={onSelect} onCreateProject={vi.fn()} onDeleteProject={vi.fn()} />);
    fireEvent.click(screen.getByText("Backend API"));
    expect(onSelect).toHaveBeenCalledWith("p1");
  });

  it("'새 프로젝트' 클릭 시 onCreateProject가 호출된다", () => {
    const onCreateProject = vi.fn();
    render(<ProjectSidebar org={org} projects={[]} selectedProjectId={null} onSelect={vi.fn()} onCreateProject={onCreateProject} onDeleteProject={vi.fn()} />);
    fireEvent.click(screen.getByText("+ 새 프로젝트"));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });
});

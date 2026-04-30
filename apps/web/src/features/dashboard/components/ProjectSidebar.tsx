import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";
import {
  sidebar, sidebarHeader, orgName, sectionLabel,
  projectItem, projectItemActive, dot, addProjectBtn, scrollArea,
} from "./ProjectSidebar.css";

interface ProjectSidebarProps {
  org: OrgResponse;
  projects: ProjectResponse[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreateProject: () => void;
}

export const ProjectSidebar = ({
  org, projects, selectedProjectId, onSelect, onCreateProject,
}: ProjectSidebarProps) => (
  <aside className={sidebar} aria-label="프로젝트 목록">
    <div className={sidebarHeader}>
      <div className={orgName}>{org.name}</div>
    </div>
    <div className={sectionLabel}>프로젝트</div>
    <div className={scrollArea}>
      {projects.map((project) => (
        <button
          key={project.id}
          className={[projectItem, selectedProjectId === project.id ? projectItemActive : undefined].filter(Boolean).join(" ")}
          onClick={() => onSelect(project.id)}
          aria-pressed={selectedProjectId === project.id}
        >
          <span className={dot} />
          {project.name}
        </button>
      ))}
      <button className={addProjectBtn} onClick={onCreateProject}>
        + 새 프로젝트
      </button>
    </div>
  </aside>
);

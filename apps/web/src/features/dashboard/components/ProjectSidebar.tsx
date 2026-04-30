import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";
import {
  sidebar, sidebarHeader, orgName, sectionLabel,
  projectItemWrapper, projectItem, projectItemActive, projectDeleteBtn,
  dot, addProjectBtn, scrollArea,
} from "./ProjectSidebar.css";

interface ProjectSidebarProps {
  org: OrgResponse;
  projects: ProjectResponse[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export const ProjectSidebar = ({
  org, projects, selectedProjectId, onSelect, onDeleteProject, onCreateProject,
}: ProjectSidebarProps) => (
  <aside className={sidebar} aria-label="프로젝트 목록">
    <div className={sidebarHeader}>
      <div className={orgName}>{org.name}</div>
    </div>
    <div className={sectionLabel}>프로젝트</div>
    <div className={scrollArea}>
      {projects.map((project) => (
        <div key={project.id} className={projectItemWrapper}>
          <button
            className={[projectItem, selectedProjectId === project.id ? projectItemActive : undefined].filter(Boolean).join(" ")}
            onClick={() => onSelect(project.id)}
            aria-pressed={selectedProjectId === project.id}
          >
            <span className={dot} />
            {project.name}
          </button>
          <button
            className={projectDeleteBtn}
            aria-label={`${project.name} 삭제`}
            onClick={() => {
              if (window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까? 모든 ERD가 함께 삭제됩니다.`)) {
                onDeleteProject(project.id);
              }
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button className={addProjectBtn} onClick={onCreateProject}>
        + 새 프로젝트
      </button>
    </div>
  </aside>
);

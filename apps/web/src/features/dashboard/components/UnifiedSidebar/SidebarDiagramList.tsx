import { useNavigate } from "react-router-dom";
import type { DiagramDialect } from "@erdify/domain";
import type { ProjectResponse } from "@/shared/api/projects.api";
import type { DiagramListItem } from "@/shared/api/diagrams.api";
import { useDashboardStore } from "@/features/dashboard/store/useDashboardStore";
import { useDashboardActions } from "@/features/dashboard/hooks/useDashboardActions";
import * as css from "./unified-sidebar.css";

const dialectLabel: Record<DiagramDialect, string> = {
  postgresql: "PG",
  mysql: "MY",
  mariadb: "MA",
  mssql: "MS",
};

interface SidebarDiagramListProps {
  orgId: string;
  projectId: string | undefined;
  projects: ProjectResponse[];
  diagrams: DiagramListItem[];
  memberManagementActive: boolean;
  orgSettingsActive: boolean;
}

export const SidebarDiagramList = ({
  orgId, projectId, projects, diagrams, memberManagementActive, orgSettingsActive,
}: SidebarDiagramListProps) => {
  const navigate = useNavigate();
  const openModal = useDashboardStore((s) => s.openModal);
  const { deleteProject } = useDashboardActions();

  const handleDeleteProject = (project: ProjectResponse) => () => {
    if (window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까? 모든 ERD가 함께 삭제됩니다.`)) {
      deleteProject(project.id);
    }
  };

  const handleSelectProject = (pid: string) => {
    if (pid === projectId) {
      navigate(`/${orgId}`);
    } else {
      navigate(`/${orgId}/${pid}`);
    }
  };

  return (
    <>
      <div className={css.tree}>
        <div className={css.treeSectionLabel}>프로젝트</div>
        {projects.map((project) => {
          const isExpanded = projectId === project.id;
          return (
            <div key={project.id}>
              <div className={css.projRowWrapper}>
                <button
                  className={[css.projRow, isExpanded ? css.projRowActive : ""].filter(Boolean).join(" ")}
                  onClick={() => handleSelectProject(project.id)}
                  aria-pressed={isExpanded}
                >
                  <span className={css.projArrow} aria-hidden="true">{isExpanded ? "▾" : "▸"}</span>
                  <span className={css.projIcon} aria-hidden="true">📁</span>
                  <span className={css.projName}>{project.name}</span>
                </button>
                <button
                  className={css.projDeleteBtn}
                  aria-label={`${project.name} 삭제`}
                  onClick={handleDeleteProject(project)}
                >
                  ×
                </button>
              </div>
              {isExpanded && (
                <>
                  {diagrams.filter((d) => d.projectId === project.id).map((diagram) => (
                    <button
                      key={diagram.id}
                      className={css.erdRow}
                      onClick={() => navigate(`/diagrams/${diagram.id}`)}
                    >
                      <span className={css.erdDot} aria-hidden="true" />
                      <span className={css.erdName}>{diagram.name}</span>
                      <span className={css.erdBadge} aria-hidden="true">
                        {diagram.dialect ? dialectLabel[diagram.dialect] : ""}
                      </span>
                    </button>
                  ))}
                  <button className={css.erdNewBtn} onClick={() => openModal("diagram")}>
                    + 새 ERD 만들기
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className={[css.treeSectionLabel, css.treeSectionLabelSpaced].join(" ")}>관리</div>
      <button
        className={[css.projRow, memberManagementActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
        onClick={() => navigate(`/${orgId}/members`)}
        aria-pressed={memberManagementActive}
      >
        <span className={css.projArrow} aria-hidden="true" />
        <span className={css.projIcon} aria-hidden="true">👥</span>
        <span className={css.projName}>멤버 관리</span>
      </button>
      <button
        className={[css.projRow, orgSettingsActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
        onClick={() => navigate(`/${orgId}/settings`)}
        aria-pressed={orgSettingsActive}
      >
        <span className={css.projArrow} aria-hidden="true" />
        <span className={css.projIcon} aria-hidden="true">⚙️</span>
        <span className={css.projName}>조직 설정</span>
      </button>
      <div className={css.sidebarFooter}>
        <button className={css.addProjectBtn} onClick={() => openModal("project")}>
          + 새 프로젝트
        </button>
      </div>
    </>
  );
};

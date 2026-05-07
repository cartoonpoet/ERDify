import { useState } from "react";
import type { FocusEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyOrganizations } from "../../../shared/api/organizations.api";
import { listProjects } from "../../../shared/api/projects.api";
import { listDiagrams } from "../../../shared/api/diagrams.api";
import type { DiagramDialect } from "@erdify/domain";
import * as css from "./unified-sidebar.css";

interface UnifiedSidebarProps {
  onCreateOrg: () => void;
  onDeleteOrg: (orgId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onCreateDiagram: () => void;
}

const dialectLabel: Record<DiagramDialect, string> = {
  postgresql: "PG",
  mysql: "MY",
  mariadb: "MA",
  mssql: "MS",
};

export const UnifiedSidebar = ({
  onCreateOrg, onDeleteOrg,
  onCreateProject, onDeleteProject,
  onCreateDiagram,
}: UnifiedSidebarProps) => {
  const navigate = useNavigate();
  const { orgId, projectId } = useParams<{ orgId?: string; projectId?: string }>();
  const { pathname } = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: listMyOrganizations,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => listProjects(orgId!),
    enabled: !!orgId,
  });
  const { data: diagrams = [] } = useQuery({
    queryKey: ["diagrams", projectId],
    queryFn: () => listDiagrams(projectId!),
    enabled: !!projectId,
  });

  const selectedOrg = orgs.find((o) => o.id === orgId) ?? null;
  const memberManagementActive = pathname.endsWith("/members");
  const apiKeysActive = pathname.endsWith("/api-keys");

  const handleSelectOrg = (id: string) => {
    navigate(`/${id}`);
    setDropdownOpen(false);
  };

  const handleSelectProject = (pid: string) => {
    if (pid === projectId) {
      navigate(`/${orgId}`);
    } else {
      navigate(`/${orgId}/${pid}`);
    }
  };

  const handleWrapperBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropdownOpen(false);
  };

  return (
    <aside className={css.sidebar} aria-label="사이드바">
      <div
        className={css.orgSelectorWrapper}
        tabIndex={-1}
        onBlur={handleWrapperBlur}
      >
        <button
          className={css.orgSelector}
          onClick={() => setDropdownOpen((v) => !v)}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
        >
          {selectedOrg ? (
            <>
              <div className={css.orgBadge} aria-hidden="true">
                {selectedOrg.name.charAt(0).toUpperCase()}
              </div>
              <div className={css.orgInfo}>
                <div className={css.orgName}>{selectedOrg.name}</div>
                <div className={css.orgSub}>{projects.length}개 프로젝트</div>
              </div>
            </>
          ) : (
            <span className={css.orgPlaceholder}>조직을 선택하세요</span>
          )}
          <span className={css.orgChevron} aria-hidden="true">⌄</span>
        </button>

        {dropdownOpen && (
          <div className={css.orgDropdown} role="listbox">
            {orgs.map((org) => (
              <div key={org.id} className={css.orgDropdownItemWrapper}>
                <button
                  className={css.orgDropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectOrg(org.id);
                  }}
                >
                  <span className={css.checkMark} aria-hidden="true">
                    {org.id === orgId ? "✓" : ""}
                  </span>
                  <span className={css.orgBadgeSmall} aria-hidden="true">
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={css.orgDropdownName}>{org.name}</span>
                </button>
                <button
                  className={css.orgDropdownDeleteBtn}
                  aria-label={`${org.name} 삭제`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`"${org.name}" 조직을 삭제하시겠습니까? 모든 프로젝트와 ERD가 함께 삭제됩니다.`)) {
                      onDeleteOrg(org.id);
                    }
                    setDropdownOpen(false);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div className={css.orgDropdownDivider} />
            <button
              className={css.orgDropdownCreateBtn}
              onClick={(e) => {
                e.stopPropagation();
                onCreateOrg();
                setDropdownOpen(false);
              }}
            >
              + 새 조직 만들기
            </button>
          </div>
        )}
      </div>

      {orgId && (
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
                      onClick={() => {
                        if (window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까? 모든 ERD가 함께 삭제됩니다.`)) {
                          onDeleteProject(project.id);
                        }
                      }}
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
                            {dialectLabel[diagram.content.dialect]}
                          </span>
                        </button>
                      ))}
                      <button className={css.erdNewBtn} onClick={onCreateDiagram}>
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
          <div className={css.sidebarFooter}>
            <button className={css.addProjectBtn} onClick={onCreateProject}>
              + 새 프로젝트
            </button>
          </div>
        </>
      )}

      <div className={css.sidebarBottomBar}>
        <button
          className={[css.projRow, apiKeysActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
          onClick={() => { if (orgId) navigate(`/${orgId}/api-keys`); }}
          aria-pressed={apiKeysActive}
        >
          <span className={css.projArrow} aria-hidden="true" />
          <span className={css.projIcon} aria-hidden="true">🔑</span>
          <span className={css.projName}>API 키</span>
        </button>
      </div>
    </aside>
  );
};

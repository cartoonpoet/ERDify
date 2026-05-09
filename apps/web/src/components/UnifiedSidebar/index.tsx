import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyOrganizations } from "@/api/organizations.api";
import { listProjects } from "@/api/projects.api";
import { listDiagrams } from "@/api/diagrams.api";
import { SidebarOrgSection } from "./SidebarOrgSection";
import { SidebarDiagramList } from "./SidebarDiagramList";
import { SidebarBottomBar } from "./SidebarBottomBar";
import * as css from "./unified-sidebar.css";

interface UnifiedSidebarProps {
  onCreateOrg: () => void;
  onDeleteOrg: (orgId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onCreateDiagram: () => void;
}

export const UnifiedSidebar = ({
  onCreateOrg, onDeleteOrg,
  onCreateProject, onDeleteProject,
  onCreateDiagram,
}: UnifiedSidebarProps) => {
  const { orgId, projectId } = useParams<{ orgId?: string; projectId?: string }>();
  const { pathname } = useLocation();

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

  const memberManagementActive = pathname.endsWith("/members");
  const apiKeysActive = pathname.endsWith("/api-keys");

  return (
    <aside className={css.sidebar} aria-label="사이드바">
      <SidebarOrgSection
        orgs={orgs}
        orgId={orgId}
        projectCount={projects.length}
        onDeleteOrg={onDeleteOrg}
        onCreateOrg={onCreateOrg}
      />
      {orgId && (
        <SidebarDiagramList
          orgId={orgId}
          projectId={projectId}
          projects={projects}
          diagrams={diagrams}
          memberManagementActive={memberManagementActive}
          onDeleteProject={onDeleteProject}
          onCreateDiagram={onCreateDiagram}
          onCreateProject={onCreateProject}
        />
      )}
      <SidebarBottomBar orgId={orgId} apiKeysActive={apiKeysActive} />
    </aside>
  );
};

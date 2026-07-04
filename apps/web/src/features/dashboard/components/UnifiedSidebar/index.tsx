import { useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyOrganizations } from "@/shared/api/organizations.api";
import { listProjects } from "@/shared/api/projects.api";
import { listDiagrams } from "@/shared/api/diagrams.api";
import { queryKeys } from "@/shared/lib/queryKeys";
import { SidebarOrgSection } from "./SidebarOrgSection";
import { SidebarDiagramList } from "./SidebarDiagramList";
import { SidebarBottomBar } from "./SidebarBottomBar";
import * as css from "./unified-sidebar.css";

export const UnifiedSidebar = () => {
  const { orgId, projectId } = useParams<{ orgId?: string; projectId?: string }>();
  const { pathname } = useLocation();

  // Preserve last selection when navigating to org-less routes (e.g. /admin/error-reports)
  const lastOrgIdRef = useRef(orgId);
  const lastProjectIdRef = useRef(projectId);
  if (orgId) lastOrgIdRef.current = orgId;
  if (orgId && projectId) lastProjectIdRef.current = projectId;
  if (orgId && !projectId) lastProjectIdRef.current = undefined;

  const displayOrgId = orgId ?? lastOrgIdRef.current;
  const displayProjectId = orgId ? projectId : undefined;

  const { data: orgs = [] } = useQuery({
    queryKey: queryKeys.orgs(),
    queryFn: listMyOrganizations,
  });
  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(displayOrgId!),
    queryFn: () => listProjects(displayOrgId!),
    enabled: !!displayOrgId,
  });
  const { data: diagrams = [] } = useQuery({
    queryKey: queryKeys.diagrams(displayProjectId!),
    queryFn: () => listDiagrams(displayProjectId!),
    enabled: !!displayProjectId,
  });

  const memberManagementActive = pathname.endsWith("/members");
  const apiKeysActive = pathname.endsWith("/api-keys");
  const orgSettingsActive = pathname.endsWith("/settings");

  return (
    <aside className={css.sidebar} aria-label="사이드바">
      <SidebarOrgSection
        orgs={orgs}
        orgId={displayOrgId}
        projectCount={projects.length}
      />
      {displayOrgId && (
        <SidebarDiagramList
          orgId={displayOrgId}
          projectId={displayProjectId}
          projects={projects}
          diagrams={diagrams}
          memberManagementActive={memberManagementActive}
          orgSettingsActive={orgSettingsActive}
        />
      )}
      <SidebarBottomBar orgId={displayOrgId} apiKeysActive={apiKeysActive} />
    </aside>
  );
};

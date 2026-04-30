import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyOrganizations } from "../../../shared/api/organizations.api";
import { listProjects } from "../../../shared/api/projects.api";
import { listDiagrams } from "../../../shared/api/diagrams.api";
import { useWorkspaceStore } from "../../../shared/stores/useWorkspaceStore";
import { vars } from "../../../design-system/tokens.css";
import { OrgRail } from "../components/OrgRail";
import { ProjectSidebar } from "../components/ProjectSidebar";
import { DiagramGrid } from "../components/DiagramGrid";
import { CreateOrgModal } from "../components/CreateOrgModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateDiagramModal } from "../components/CreateDiagramModal";
import {
  shell, topbar, brand, brandAccent, topbarSpacer, avatar, body,
} from "./dashboard-page.css";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrganizationId, selectedProjectId, selectOrganization, selectProject } =
    useWorkspaceStore();

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: listMyOrganizations,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", selectedOrganizationId],
    queryFn: () => listProjects(selectedOrganizationId!),
    enabled: !!selectedOrganizationId,
  });

  const { data: diagrams = [], isLoading: diagramsLoading } = useQuery({
    queryKey: ["diagrams", selectedProjectId],
    queryFn: () => listDiagrams(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const selectedOrg = orgs.find((o) => o.id === selectedOrganizationId) ?? null;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div className={shell}>
      <header className={topbar}>
        <div className={brand}>
          ERD<span className={brandAccent}>ify</span>
        </div>
        <div className={topbarSpacer} />
        <div className={avatar}>J</div>
      </header>

      <div className={body}>
        <OrgRail
          orgs={orgs}
          selectedOrgId={selectedOrganizationId}
          onSelect={selectOrganization}
          onCreateOrg={() => setOrgModalOpen(true)}
        />

        {selectedOrg ? (
          <ProjectSidebar
            org={selectedOrg}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={selectProject}
            onCreateProject={() => setProjectModalOpen(true)}
          />
        ) : (
          <div style={{ width: 220, borderRight: `1px solid ${vars.color.border}` }} />
        )}

        <DiagramGrid
          diagrams={diagrams}
          {...(selectedProject?.name ? { projectName: selectedProject.name } : {})}
          onCreateDiagram={() => setDiagramModalOpen(true)}
          loading={diagramsLoading && !!selectedProjectId}
        />
      </div>

      <CreateOrgModal
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["orgs"] })}
      />

      {selectedOrganizationId && (
        <CreateProjectModal
          open={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["projects", selectedOrganizationId] })}
          orgId={selectedOrganizationId}
        />
      )}

      {selectedProjectId && (
        <CreateDiagramModal
          open={diagramModalOpen}
          onClose={() => setDiagramModalOpen(false)}
          onCreated={(id) => navigate(`/diagrams/${id}`)}
          projectId={selectedProjectId}
        />
      )}
    </div>
  );
};

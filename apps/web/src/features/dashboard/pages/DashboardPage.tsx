import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FocusEvent } from "react";
import { listMyOrganizations, deleteOrganization } from "../../../shared/api/organizations.api";
import { listProjects, deleteProject } from "../../../shared/api/projects.api";
import { listDiagrams, deleteDiagram } from "../../../shared/api/diagrams.api";
import { getMe } from "../../../shared/api/auth.api";
import { API_BASE_URL } from "../../../shared/api/httpClient";
import { useWorkspaceStore } from "../../../shared/stores/useWorkspaceStore";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { OrgRail } from "../components/OrgRail";
import { ProjectSidebar } from "../components/ProjectSidebar";
import { DiagramGrid } from "../components/DiagramGrid";
import { CreateOrgModal } from "../components/CreateOrgModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateDiagramModal } from "../components/CreateDiagramModal";
import { ImportDiagramModal } from "../components/ImportDiagramModal";
import { ApiKeyModal } from "../components/ApiKeyModal";
import { ProfileModal } from "../components/ProfileModal";
import {
  shell, topbar, brand, brandAccent, topbarSpacer, avatar, avatarImg,
  avatarWrapper, dropdown, dropdownHeader, dropdownEmail,
  dropdownItem, dropdownItemDanger, body, emptySidebar,
} from "./dashboard-page.css";

function decodeJwt(token: string | null): { email?: string; sub?: string } {
  if (!token) return {};
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    return JSON.parse(atob(payload)) as { email?: string; sub?: string };
  } catch {
    return {};
  }
}

function getInitial(email: string | undefined | null): string {
  return (email?.split("@")[0]?.[0] ?? "?").toUpperCase();
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrganizationId, selectedProjectId, selectOrganization, selectProject, reset } =
    useWorkspaceStore();
  const { token, clearToken } = useAuthStore();

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { email, sub: currentUserId } = decodeJwt(token);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: !!token,
  });

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

  const deleteOrgMutation = useMutation({
    mutationFn: (orgId: string) => deleteOrganization(orgId),
    onSuccess: (_data, orgId) => {
      if (selectedOrganizationId === orgId) reset();
      void queryClient.invalidateQueries({ queryKey: ["orgs"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => deleteProject(selectedOrganizationId!, projectId),
    onSuccess: (_data, projectId) => {
      if (selectedProjectId === projectId) selectOrganization(selectedOrganizationId!);
      void queryClient.invalidateQueries({ queryKey: ["projects", selectedOrganizationId] });
    },
  });

  const deleteDiagramMutation = useMutation({
    mutationFn: (diagramId: string) => deleteDiagram(diagramId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diagrams", selectedProjectId] });
    },
  });

  const selectedOrg = orgs.find((o) => o.id === selectedOrganizationId) ?? null;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  function handleLogout() {
    clearToken();
    reset();
    queryClient.clear();
    navigate("/login");
  }

  function handleAvatarMenuBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
  }

  function handleAvatarClick() {
    setMenuOpen((v) => !v);
  }

  function handleOpenOrgModal() { setOrgModalOpen(true); }
  function handleCloseOrgModal() { setOrgModalOpen(false); }
  function handleOrgCreated() { void queryClient.invalidateQueries({ queryKey: ["orgs"] }); }

  function handleOpenProjectModal() { setProjectModalOpen(true); }
  function handleCloseProjectModal() { setProjectModalOpen(false); }
  function handleProjectCreated() {
    void queryClient.invalidateQueries({ queryKey: ["projects", selectedOrganizationId] });
  }

  function handleOpenDiagramModal() { setDiagramModalOpen(true); }
  function handleCloseDiagramModal() { setDiagramModalOpen(false); }
  function handleDiagramCreated(id: string) { navigate(`/diagrams/${id}`); }

  function handleOpenImportModal() { setImportModalOpen(true); }
  function handleCloseImportModal() { setImportModalOpen(false); }
  function handleDiagramImported(id: string) { navigate(`/diagrams/${id}`); }

  function handleDeleteOrg(id: string) { deleteOrgMutation.mutate(id); }
  function handleDeleteProject(id: string) { deleteProjectMutation.mutate(id); }
  function handleDeleteDiagram(id: string) { deleteDiagramMutation.mutate(id); }

  return (
    <div className={shell}>
      <header className={topbar}>
        <div className={brand}>
          ERD<span className={brandAccent}>ify</span>
        </div>
        <div className={topbarSpacer} />

        <div className={avatarWrapper} tabIndex={-1} onBlur={handleAvatarMenuBlur}>
          {me?.avatarUrl ? (
            <img
              src={me.avatarUrl.startsWith("http") ? me.avatarUrl : `${API_BASE_URL}${me.avatarUrl}`}
              alt="프로필"
              className={avatarImg}
              onClick={handleAvatarClick}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className={avatar} onClick={handleAvatarClick}>
              {getInitial(me?.name ?? email)}
            </div>
          )}

          {menuOpen && (
            <div className={dropdown}>
              <div className={dropdownHeader}>
                <div className={dropdownEmail}>{me?.name ?? email ?? "사용자"}</div>
              </div>
              <button className={dropdownItem} onClick={() => { setMenuOpen(false); setProfileModalOpen(true); }}>
                회원정보 수정
              </button>
              <button className={dropdownItem} onClick={() => { setMenuOpen(false); setApiKeyModalOpen(true); }}>
                MCP API 키
              </button>
              <button className={`${dropdownItem} ${dropdownItemDanger}`} onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={body}>
        <OrgRail
          orgs={orgs}
          selectedOrgId={selectedOrganizationId}
          onSelect={selectOrganization}
          onDeleteOrg={handleDeleteOrg}
          onCreateOrg={handleOpenOrgModal}
        />

        {selectedOrg ? (
          <ProjectSidebar
            org={selectedOrg}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={selectProject}
            onDeleteProject={handleDeleteProject}
            onCreateProject={handleOpenProjectModal}
          />
        ) : (
          <div className={emptySidebar} />
        )}

        <DiagramGrid
          diagrams={diagrams}
          {...(selectedProject?.name ? { projectName: selectedProject.name } : {})}
          currentUserId={currentUserId ?? null}
          onCreateDiagram={handleOpenDiagramModal}
          {...(selectedProjectId ? { onImportDiagram: handleOpenImportModal } : {})}
          onDeleteDiagram={handleDeleteDiagram}
          loading={diagramsLoading && !!selectedProjectId}
        />
      </div>

      <CreateOrgModal
        open={orgModalOpen}
        onClose={handleCloseOrgModal}
        onCreated={handleOrgCreated}
      />

      {selectedOrganizationId && (
        <CreateProjectModal
          open={projectModalOpen}
          onClose={handleCloseProjectModal}
          onCreated={handleProjectCreated}
          orgId={selectedOrganizationId}
        />
      )}

      {selectedProjectId && (
        <CreateDiagramModal
          open={diagramModalOpen}
          onClose={handleCloseDiagramModal}
          onCreated={handleDiagramCreated}
          projectId={selectedProjectId}
        />
      )}

      <ApiKeyModal
        open={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {selectedProjectId && (
        <ImportDiagramModal
          open={importModalOpen}
          projectId={selectedProjectId}
          onClose={handleCloseImportModal}
          onImported={handleDiagramImported}
        />
      )}
    </div>
  );
};

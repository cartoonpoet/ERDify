import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FocusEvent } from "react";
import { listMyOrganizations, deleteOrganization } from "../../../shared/api/organizations.api";
import { listProjects, deleteProject } from "../../../shared/api/projects.api";
import { listDiagrams, deleteDiagram } from "../../../shared/api/diagrams.api";
import { getMe, logout } from "../../../shared/api/auth.api";
import { API_BASE_URL } from "../../../shared/api/httpClient";
import { useWorkspaceStore } from "../../../shared/stores/useWorkspaceStore";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { UnifiedSidebar } from "../components/UnifiedSidebar";
import { DiagramGrid } from "../components/DiagramGrid";
import { CreateOrgModal } from "../components/CreateOrgModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateDiagramModal } from "../components/CreateDiagramModal";
import { ImportDiagramModal } from "../components/ImportDiagramModal";
import { ProfileModal } from "../components/ProfileModal";
import { MemberManagementPage } from "./MemberManagementPage";
import {
  shell, topbar, brand, brandLogo, topbarSpacer, topbarSearch, avatar, avatarImg,
  avatarWrapper, dropdown, dropdownHeader, dropdownEmail,
  dropdownItem, dropdownItemDanger, body,
} from "./dashboard-page.css";

function getInitial(email: string | undefined | null): string {
  return (email?.split("@")[0]?.[0] ?? "?").toUpperCase();
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrganizationId, selectedProjectId, selectOrganization, selectProject, reset } =
    useWorkspaceStore();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberManagementOpen, setMemberManagementOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
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
      if (selectedOrganizationId === orgId) {
        reset();
        setMemberManagementOpen(false);
      }
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

  // Auto-select first org when none is selected (or persisted org no longer exists)
  useEffect(() => {
    const firstOrg = orgs[0];
    if (!firstOrg) return;
    if (!selectedOrganizationId || !orgs.find((o) => o.id === selectedOrganizationId)) {
      selectOrganization(firstOrg.id);
    }
  }, [orgs, selectedOrganizationId, selectOrganization]);

  // Auto-select first project when org is set but no project is selected (or persisted project no longer exists)
  useEffect(() => {
    const firstProject = projects[0];
    if (!selectedOrganizationId || !firstProject) return;
    if (!selectedProjectId || !projects.find((p) => p.id === selectedProjectId)) {
      selectProject(firstProject.id);
      setSearchQuery("");
    }
  }, [projects, selectedProjectId, selectedOrganizationId, selectProject]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  async function handleLogout() {
    await logout().catch(() => undefined);
    setAuthenticated(false);
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
  function handleDeleteDiagram(id: string) { deleteDiagramMutation.mutate(id); }

  function handleSelectOrg(orgId: string) {
    selectOrganization(orgId);
    setMemberManagementOpen(false);
  }

  function handleSelectProject(projectId: string) {
    if (selectedProjectId === projectId) {
      if (selectedOrganizationId) selectOrganization(selectedOrganizationId);
    } else {
      selectProject(projectId);
      setSearchQuery("");
    }
  }

  function handleDeleteProject(id: string) { deleteProjectMutation.mutate(id); }

  return (
    <div className={shell}>
      <header className={topbar}>
        <div className={brand}>
          <img src="/logo.svg" alt="ERDify" className={brandLogo} />
        </div>
        <div className={topbarSpacer} />

        <input
          className={topbarSearch}
          type="text"
          placeholder="다이어그램 검색... ⌘K"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!selectedProjectId}
          aria-label="다이어그램 검색"
        />

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
              {getInitial(me?.name ?? me?.email)}
            </div>
          )}

          {menuOpen && (
            <div className={dropdown}>
              <div className={dropdownHeader}>
                <div className={dropdownEmail}>{me?.name ?? me?.email ?? "사용자"}</div>
              </div>
              <button className={dropdownItem} onClick={() => { setMenuOpen(false); setProfileModalOpen(true); }}>
                회원정보 수정
              </button>
              <button className={dropdownItem} onClick={() => { setMenuOpen(false); navigate("/settings/api-keys"); }}>
                API 키 관리
              </button>
              <button className={`${dropdownItem} ${dropdownItemDanger}`} onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={body}>
        <UnifiedSidebar
          orgs={orgs}
          selectedOrgId={selectedOrganizationId}
          onSelectOrg={handleSelectOrg}
          onDeleteOrg={handleDeleteOrg}
          onCreateOrg={handleOpenOrgModal}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          onCreateProject={handleOpenProjectModal}
          diagrams={diagrams}
          onCreateDiagram={handleOpenDiagramModal}
          memberManagementActive={memberManagementOpen}
          onManageMembers={() => setMemberManagementOpen(true)}
        />

        {memberManagementOpen && selectedOrganizationId ? (
          <MemberManagementPage
            orgId={selectedOrganizationId}
            orgName={orgs.find((o) => o.id === selectedOrganizationId)?.name ?? ""}
          />
        ) : (
          <DiagramGrid
            diagrams={diagrams}
            {...(selectedProject?.name ? { projectName: selectedProject.name } : {})}
            currentUserId={me?.id ?? null}
            onCreateDiagram={handleOpenDiagramModal}
            {...(selectedProjectId ? { onImportDiagram: handleOpenImportModal } : {})}
            onDeleteDiagram={handleDeleteDiagram}
            loading={diagramsLoading && !!selectedProjectId}
            {...(searchQuery ? { filterQuery: searchQuery } : {})}
          />
        )}
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

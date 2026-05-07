import { useState, useEffect } from "react";
import { useNavigate, useParams, Outlet } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FocusEvent } from "react";
import { deleteOrganization } from "../../../shared/api/organizations.api";
import { deleteProject } from "../../../shared/api/projects.api";
import { deleteDiagram } from "../../../shared/api/diagrams.api";
import { getMe, logout } from "../../../shared/api/auth.api";
import { API_BASE_URL } from "../../../shared/api/httpClient";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { UnifiedSidebar } from "../components/UnifiedSidebar";
import { CreateOrgModal } from "../components/CreateOrgModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateDiagramModal } from "../components/CreateDiagramModal";
import { ImportDiagramModal } from "../components/ImportDiagramModal";
import { ProfileModal } from "../components/ProfileModal";
import {
  shell, topbar, brand, brandLogo, topbarSpacer, topbarSearch, avatar, avatarImg,
  avatarWrapper, dropdown, dropdownHeader, dropdownEmail,
  dropdownItem, dropdownItemDanger, body,
} from "./dashboard-page.css";

export interface DashboardOutletContext {
  onCreateDiagram: () => void;
  onImportDiagram: () => void;
  onDeleteDiagram: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

function getInitial(email: string | undefined | null): string {
  return (email?.split("@")[0]?.[0] ?? "?").toUpperCase();
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { orgId, projectId } = useParams<{ orgId: string; projectId?: string }>();
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery("");
  }, [projectId]);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: (_data, deletedOrgId) => {
      if (orgId === deletedOrgId) navigate("/");
      void queryClient.invalidateQueries({ queryKey: ["orgs"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (pid: string) => {
      if (!orgId) return Promise.reject(new Error("no org"));
      return deleteProject(orgId, pid);
    },
    onSuccess: (_data, deletedProjectId) => {
      if (projectId === deletedProjectId) navigate(`/${orgId}`);
      void queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
    },
  });

  const deleteDiagramMutation = useMutation({
    mutationFn: (id: string) => deleteDiagram(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diagrams", projectId] });
    },
  });

  async function handleLogout() {
    await logout().catch(() => undefined);
    setAuthenticated(false);
    queryClient.clear();
    navigate("/login");
  }

  function handleAvatarMenuBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
  }

  const outletCtx: DashboardOutletContext = {
    onCreateDiagram: () => setDiagramModalOpen(true),
    onImportDiagram: () => setImportModalOpen(true),
    onDeleteDiagram: (id) => deleteDiagramMutation.mutate(id),
    searchQuery,
    onSearchChange: setSearchQuery,
  };

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
          disabled={!projectId}
          aria-label="다이어그램 검색"
        />

        <div className={avatarWrapper} tabIndex={-1} onBlur={handleAvatarMenuBlur}>
          {me?.avatarUrl ? (
            <img
              src={me.avatarUrl.startsWith("http") ? me.avatarUrl : `${API_BASE_URL}${me.avatarUrl}`}
              alt="프로필"
              className={avatarImg}
              onClick={() => setMenuOpen((v) => !v)}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className={avatar} onClick={() => setMenuOpen((v) => !v)}>
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
              <button className={`${dropdownItem} ${dropdownItemDanger}`} onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={body}>
        <UnifiedSidebar
          onCreateOrg={() => setOrgModalOpen(true)}
          onDeleteOrg={(id) => deleteOrgMutation.mutate(id)}
          onCreateProject={() => setProjectModalOpen(true)}
          onDeleteProject={(id) => deleteProjectMutation.mutate(id)}
          onCreateDiagram={() => setDiagramModalOpen(true)}
        />

        <Outlet context={outletCtx} />
      </div>

      <CreateOrgModal
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["orgs"] })}
      />

      {orgId && (
        <CreateProjectModal
          open={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ["projects", orgId] })}
          orgId={orgId}
        />
      )}

      {projectId && (
        <CreateDiagramModal
          open={diagramModalOpen}
          onClose={() => setDiagramModalOpen(false)}
          onCreated={(id) => navigate(`/diagrams/${id}`)}
          projectId={projectId}
        />
      )}

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {projectId && (
        <ImportDiagramModal
          open={importModalOpen}
          projectId={projectId}
          onClose={() => setImportModalOpen(false)}
          onImported={(id) => navigate(`/diagrams/${id}`)}
        />
      )}
    </div>
  );
};

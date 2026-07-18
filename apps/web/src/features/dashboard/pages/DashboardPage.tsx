import { useParams, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/shared/api/auth.api";
import { queryKeys } from "@/shared/lib/queryKeys";
import { QueryErrorBoundary } from "@/shared/components/QueryErrorBoundary";
import { UnifiedSidebar } from "@/features/dashboard/components/UnifiedSidebar";
import { CreateOrgModal } from "../components/CreateOrgModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateDiagramModal } from "../components/CreateDiagramModal";
import { ImportDiagramModal } from "../components/ImportDiagramModal";
import { ProfileModal } from "../components/ProfileModal";
import { useDashboardStore } from "@/features/dashboard/store/useDashboardStore";
import { useDashboardActions } from "@/features/dashboard/hooks/useDashboardActions";
import { useAvatarMenu } from "@/features/dashboard/hooks/useAvatarMenu";
import { AnnouncementModal } from "@/features/announcement/components/AnnouncementModal";
import { useAnnouncements } from "@/features/announcement/hooks/useAnnouncements";
import {
  shell, topbar, brand, brandLogo, topbarSpacer, topbarSearch, avatar, avatarImg, avatarBtn,
  avatarWrapper, dropdown, dropdownHeader, dropdownEmail,
  dropdownItem, dropdownItemDanger, body,
} from "./dashboard-page.css";

// Prefetch automerge WASM in the background so the editor opens instantly
void import("@automerge/automerge");

export interface DashboardOutletContext {
  onCreateDiagram: () => void;
  onImportDiagram: () => void;
  onDeleteDiagram: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const getInitial = (email: string | undefined | null): string =>
  (email?.split("@")[0]?.[0] ?? "?").toUpperCase();

export const DashboardPage = () => {
  const { orgId, projectId } = useParams<{ orgId: string; projectId?: string }>();
  const { data: me } = useQuery({ queryKey: queryKeys.me(), queryFn: getMe });

  const { activeModal, openModal, closeModal, searchQuery, searchProjectId, setSearch } = useDashboardStore();
  const { deleteDiagram, handleLogout, onOrgCreated, onProjectCreated, onDiagramCreated, onDiagramImported } = useDashboardActions();
  const { menuOpen, toggleMenu, closeMenu, handleBlur } = useAvatarMenu();
  const { unread, markSeen, markAllSeen } = useAnnouncements();

  // resets naturally when projectId changes — no useEffect needed
  const currentSearch = searchProjectId === projectId ? searchQuery : "";
  const handleSearchChange = (q: string) => setSearch(projectId ?? "", q);
  const handleOpenProfile = () => { closeMenu(); openModal("profile"); };

  const outletCtx: DashboardOutletContext = {
    onCreateDiagram: () => openModal("diagram"),
    onImportDiagram: () => openModal("import"),
    onDeleteDiagram: deleteDiagram,
    searchQuery: currentSearch,
    onSearchChange: handleSearchChange,
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
          value={currentSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          disabled={!projectId}
          aria-label="다이어그램 검색"
        />

        <div className={avatarWrapper} tabIndex={-1} onBlur={handleBlur}>
          <button type="button" className={avatarBtn} onClick={toggleMenu} aria-label="프로필 메뉴" aria-expanded={menuOpen}>
            {me?.avatarUrl ? (
              <img
                src={me.avatarUrl}
                alt=""
                className={avatarImg}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span className={avatar}>
                {getInitial(me?.name ?? me?.email)}
              </span>
            )}
          </button>

          {menuOpen && (
            <div className={dropdown}>
              <div className={dropdownHeader}>
                <div className={dropdownEmail}>{me?.name ?? me?.email ?? "사용자"}</div>
              </div>
              <button className={dropdownItem} onClick={handleOpenProfile}>
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
        <UnifiedSidebar />
        <QueryErrorBoundary variant="inline">
          <Outlet context={outletCtx} />
        </QueryErrorBoundary>
      </div>

      <CreateOrgModal
        open={activeModal === "org"}
        onClose={closeModal}
        onCreated={onOrgCreated}
      />

      {orgId && (
        <CreateProjectModal
          open={activeModal === "project"}
          onClose={closeModal}
          onCreated={onProjectCreated}
          orgId={orgId}
        />
      )}

      {projectId && (
        <CreateDiagramModal
          open={activeModal === "diagram"}
          onClose={closeModal}
          onCreated={onDiagramCreated}
          projectId={projectId}
        />
      )}

      <ProfileModal
        open={activeModal === "profile"}
        onClose={closeModal}
      />

      {projectId && (
        <ImportDiagramModal
          open={activeModal === "import"}
          projectId={projectId}
          onClose={closeModal}
          onImported={onDiagramImported}
        />
      )}

      <AnnouncementModal
        unread={unread}
        onMarkSeen={markSeen}
        onMarkAllSeen={markAllSeen}
      />
    </div>
  );
};

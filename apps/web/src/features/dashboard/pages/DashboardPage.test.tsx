import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardPage } from "./DashboardPage";

vi.mock("./dashboard-page.css", () => ({
  shell: "", topbar: "", brand: "", brandLogo: "", topbarSpacer: "", topbarSearch: "", avatar: "", avatarImg: "", avatarBtn: "",
  avatarWrapper: "", dropdown: "", dropdownHeader: "", dropdownEmail: "",
  dropdownItem: "", dropdownItemDanger: "", body: "",
}));

vi.mock("@/shared/api/auth.api", () => ({ getMe: vi.fn() }));
vi.mock("@/features/dashboard/store/useDashboardStore", () => ({ useDashboardStore: vi.fn() }));
vi.mock("@/features/dashboard/hooks/useDashboardActions", () => ({ useDashboardActions: vi.fn() }));
vi.mock("@/features/dashboard/hooks/useAvatarMenu", () => ({ useAvatarMenu: vi.fn() }));
vi.mock("@/features/announcement/hooks/useAnnouncements", () => ({ useAnnouncements: vi.fn() }));

vi.mock("@/features/dashboard/components/UnifiedSidebar", () => ({
  UnifiedSidebar: () => <div data-testid="mock-unified-sidebar" />,
}));
vi.mock("../components/CreateOrgModal", () => ({
  CreateOrgModal: () => <div data-testid="mock-create-org-modal" />,
}));
vi.mock("../components/CreateProjectModal", () => ({
  CreateProjectModal: () => <div data-testid="mock-create-project-modal" />,
}));
vi.mock("../components/CreateDiagramModal", () => ({
  CreateDiagramModal: () => <div data-testid="mock-create-diagram-modal" />,
}));
vi.mock("../components/ImportDiagramModal", () => ({
  ImportDiagramModal: () => <div data-testid="mock-import-diagram-modal" />,
}));
vi.mock("../components/ProfileModal", () => ({
  ProfileModal: () => <div data-testid="mock-profile-modal" />,
}));
vi.mock("@/features/announcement/components/AnnouncementModal", () => ({
  AnnouncementModal: () => <div data-testid="mock-announcement-modal" />,
}));

import { getMe } from "@/shared/api/auth.api";
import { useDashboardStore } from "@/features/dashboard/store/useDashboardStore";
import { useDashboardActions } from "@/features/dashboard/hooks/useDashboardActions";
import { useAvatarMenu } from "@/features/dashboard/hooks/useAvatarMenu";
import { useAnnouncements } from "@/features/announcement/hooks/useAnnouncements";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (initialPath = "/org-1") =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/:orgId/:projectId?" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockSetSearch = vi.fn();
const mockToggleMenu = vi.fn();
const mockCloseMenu = vi.fn();
const mockHandleBlur = vi.fn();
const mockHandleLogout = vi.fn();

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue({
      id: "u1", email: "a@b.com", name: "Test User", phone: null, avatarUrl: null, isAdmin: false,
    });

    vi.mocked(useDashboardStore).mockReturnValue({
      activeModal: null,
      openModal: mockOpenModal,
      closeModal: mockCloseModal,
      searchQuery: "",
      searchProjectId: undefined,
      setSearch: mockSetSearch,
    });

    vi.mocked(useDashboardActions).mockReturnValue({
      deleteOrg: vi.fn(),
      deleteProject: vi.fn(),
      deleteDiagram: vi.fn(),
      handleLogout: mockHandleLogout,
      onOrgCreated: vi.fn(),
      onProjectCreated: vi.fn(),
      onDiagramCreated: vi.fn(),
      onDiagramImported: vi.fn(),
    });

    vi.mocked(useAvatarMenu).mockReturnValue({
      menuOpen: false,
      toggleMenu: mockToggleMenu,
      closeMenu: mockCloseMenu,
      handleBlur: mockHandleBlur,
    });

    vi.mocked(useAnnouncements).mockReturnValue({
      unread: [],
      markSeen: vi.fn(),
      markAllSeen: vi.fn(),
    });
  });

  it("상단바와 검색창을 렌더링한다", () => {
    wrap();
    expect(screen.getByAltText("ERDify")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "다이어그램 검색" })).toBeInTheDocument();
  });

  it("projectId가 없으면 검색창이 disabled 상태다", () => {
    wrap("/org-1");
    expect(screen.getByRole("textbox", { name: "다이어그램 검색" })).toBeDisabled();
  });

  it("projectId가 있으면 검색창이 활성화된다", () => {
    wrap("/org-1/project-1");
    expect(screen.getByRole("textbox", { name: "다이어그램 검색" })).toBeEnabled();
  });

  it("아바타 버튼 클릭 시 toggleMenu가 호출된다", () => {
    wrap();
    fireEvent.click(screen.getByRole("button", { name: "프로필 메뉴" }));
    expect(mockToggleMenu).toHaveBeenCalledOnce();
  });

  it("menuOpen=false면 드롭다운 메뉴 항목이 보이지 않는다", () => {
    wrap();
    expect(screen.queryByText("회원정보 수정")).not.toBeInTheDocument();
    expect(screen.queryByText("로그아웃")).not.toBeInTheDocument();
  });

  describe("menuOpen=true일 때", () => {
    beforeEach(() => {
      vi.mocked(useAvatarMenu).mockReturnValue({
        menuOpen: true,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
        handleBlur: mockHandleBlur,
      });
    });

    it("드롭다운 메뉴 항목이 보인다", () => {
      wrap();
      expect(screen.getByText("회원정보 수정")).toBeInTheDocument();
      expect(screen.getByText("로그아웃")).toBeInTheDocument();
    });

    it("'회원정보 수정' 클릭 시 closeMenu와 openModal('profile')이 호출된다", () => {
      wrap();
      fireEvent.click(screen.getByText("회원정보 수정"));
      expect(mockCloseMenu).toHaveBeenCalledOnce();
      expect(mockOpenModal).toHaveBeenCalledWith("profile");
    });

    it("'로그아웃' 클릭 시 handleLogout이 호출된다", () => {
      wrap();
      fireEvent.click(screen.getByText("로그아웃"));
      expect(mockHandleLogout).toHaveBeenCalledOnce();
    });
  });
});

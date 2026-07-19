import { render, screen, fireEvent } from "@testing-library/react";
import { EditorPage } from "./EditorPage";

vi.mock("./editor-page.css", () => ({
  root: "", topbar: "", backBtn: "", breadcrumb: "", breadcrumbSegment: "",
  breadcrumbSep: "", breadcrumbCurrent: "", statusText: "", spacer: "",
  topbarBtn: () => "", topbarDivider: "", presenceGroup: "", inviteBtn: "",
  fileDropdownWrap: "", fileDropdownMenu: "", fileDropdownItem: "",
  fileDropdownSep: "", fileDropdownItemIcon: "", fileDropdownKbd: "",
  fileDropdownChevron: "", content: "", canvasArea: "",
}));

vi.mock("../hooks/useEditorPage", () => ({ useEditorPage: vi.fn() }));
vi.mock("../hooks/useEditorModals", () => ({ useEditorModals: vi.fn() }));

vi.mock("./EditorPageSkeleton", () => ({
  EditorPageSkeleton: () => <div data-testid="mock-skeleton" />,
}));

vi.mock("@xyflow/react", () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-react-flow-provider">{children}</div>,
}));

vi.mock("../components/SaveCopyModal", () => ({
  SaveCopyModal: (props: Record<string, unknown>) => (
    <div data-testid="mock-save-copy-modal" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock("../components/EditorCanvas", () => ({
  EditorCanvas: (props: Record<string, unknown>) => (
    <div data-testid="mock-editor-canvas" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock("../components/RelationshipPopover", () => ({
  RelationshipPopover: (props: Record<string, unknown>) => (
    <div data-testid="mock-relationship-popover" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock("../components/RightSidebar", () => ({
  RightSidebar: (props: Record<string, unknown>) => (
    <div data-testid="mock-right-sidebar" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock("../components/InviteModal", () => ({
  InviteModal: (props: Record<string, unknown>) => (
    <div data-testid="mock-invite-modal" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock("../components/PresenceIndicator", () => ({
  PresenceIndicator: () => <div data-testid="mock-presence-indicator" />,
}));
vi.mock("../components/ExportModal", () => ({
  ExportModal: (props: Record<string, unknown>) => (
    <div data-testid="mock-export-modal" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock("@/shared/components/ShareDiagramModal", () => ({
  ShareDiagramModal: (props: Record<string, unknown>) => (
    <div data-testid="mock-share-diagram-modal" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock("../components/FkSetupModal", () => ({
  FkSetupModal: () => <div data-testid="mock-fk-setup-modal" />,
}));
vi.mock("../components/RelDeleteConfirmModal", () => ({
  RelDeleteConfirmModal: () => <div data-testid="mock-rel-delete-confirm-modal" />,
}));
vi.mock("../components/SchemaFilterSidebar", () => ({
  SchemaFilterSidebar: () => <div data-testid="mock-schema-filter-sidebar" />,
}));
vi.mock("../components/ImportIntoEditorModal", () => ({
  ImportIntoEditorModal: (props: Record<string, unknown>) => (
    <div data-testid="mock-import-into-editor-modal" data-props={JSON.stringify(props)} />
  ),
}));

import { useEditorPage } from "../hooks/useEditorPage";
import { useEditorModals } from "../hooks/useEditorModals";

const mockHandleBack = vi.fn();
const mockHandleAddTable = vi.fn();
const mockHandleSaveCopy = vi.fn();
const mockSaveVersion = vi.fn();

const mockSetShowInvite = vi.fn();
const mockSetShowExport = vi.fn();
const mockSetShowShare = vi.fn();
const mockSetShowImport = vi.fn();
const mockSetShowSaveCopy = vi.fn();
const mockHandleFileMenuOpen = vi.fn();
const mockHandleFileMenuClose = vi.fn();
const mockHandleImportOpen = vi.fn();
const mockHandleExportOpen = vi.fn();
const mockHandleSaveCopyOpen = vi.fn();

const baseEditorPageReturn = {
  diagramId: "diagram-1",
  data: {
    id: "diagram-1",
    projectId: "project-1",
    organizationId: "org-1",
    organizationName: "조직A",
    projectName: "프로젝트A",
    name: "다이어그램A",
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    myRole: "owner",
    shareToken: null,
    shareExpiresAt: null,
    content: { dialect: "postgresql" },
  },
  isLoading: false,
  isDirty: false,
  isCollaborating: false,
  selectedRelationshipId: null,
  popoverPos: null,
  isDuplicating: false,
  saveVersion: mockSaveVersion,
  isSavingVersion: false,
  handleBack: mockHandleBack,
  handleAddTable: mockHandleAddTable,
  handleSaveCopy: mockHandleSaveCopy,
};

const baseModalsReturn = {
  showInvite: false,
  setShowInvite: mockSetShowInvite,
  showExport: false,
  setShowExport: mockSetShowExport,
  showShare: false,
  setShowShare: mockSetShowShare,
  showImport: false,
  setShowImport: mockSetShowImport,
  showFileMenu: false,
  showSaveCopy: false,
  setShowSaveCopy: mockSetShowSaveCopy,
  handleFileMenuOpen: mockHandleFileMenuOpen,
  handleFileMenuClose: mockHandleFileMenuClose,
  handleImportOpen: mockHandleImportOpen,
  handleExportOpen: mockHandleExportOpen,
  handleSaveCopyOpen: mockHandleSaveCopyOpen,
};

describe("EditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditorPage).mockReturnValue(baseEditorPageReturn as unknown as ReturnType<typeof useEditorPage>);
    vi.mocked(useEditorModals).mockReturnValue(baseModalsReturn as ReturnType<typeof useEditorModals>);
  });

  it("isLoading이 true면 스켈레톤만 렌더링한다", () => {
    vi.mocked(useEditorPage).mockReturnValue({
      ...baseEditorPageReturn,
      isLoading: true,
    } as unknown as ReturnType<typeof useEditorPage>);

    render(<EditorPage />);

    expect(screen.getByTestId("mock-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-editor-canvas")).not.toBeInTheDocument();
  });

  it("로딩이 끝나면 breadcrumb, 상태 텍스트, 캔버스 영역을 렌더링한다", () => {
    render(<EditorPage />);

    expect(screen.getByText("조직A")).toBeInTheDocument();
    expect(screen.getByText("프로젝트A")).toBeInTheDocument();
    expect(screen.getByText("다이어그램A")).toBeInTheDocument();
    expect(screen.getByText("저장됨")).toBeInTheDocument();
    expect(screen.getByTestId("mock-editor-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("mock-schema-filter-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("mock-fk-setup-modal")).toBeInTheDocument();
    expect(screen.getByTestId("mock-rel-delete-confirm-modal")).toBeInTheDocument();
  });

  it.each([
    [true, false, "동기화됨"],
    [false, true, "수정됨"],
    [false, false, "저장됨"],
  ])("isCollaborating=%s, isDirty=%s -> '%s' 표시", (isCollaborating, isDirty, expected) => {
    vi.mocked(useEditorPage).mockReturnValue({
      ...baseEditorPageReturn,
      isCollaborating,
      isDirty,
    } as unknown as ReturnType<typeof useEditorPage>);

    render(<EditorPage />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("뒤로가기 버튼 클릭 시 handleBack이 호출된다", () => {
    render(<EditorPage />);
    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(mockHandleBack).toHaveBeenCalledOnce();
  });

  it("테이블 추가 버튼 클릭 시 handleAddTable이 호출된다", () => {
    render(<EditorPage />);
    fireEvent.click(screen.getByText("+ 테이블"));
    expect(mockHandleAddTable).toHaveBeenCalledOnce();
  });

  it("버전 저장 버튼 클릭 시 saveVersion이 호출된다", () => {
    render(<EditorPage />);
    fireEvent.click(screen.getByText("↑ 버전 저장"));
    expect(mockSaveVersion).toHaveBeenCalledOnce();
  });

  it("isSavingVersion=true면 버전 저장 버튼이 disabled된다", () => {
    vi.mocked(useEditorPage).mockReturnValue({
      ...baseEditorPageReturn,
      isSavingVersion: true,
    } as unknown as ReturnType<typeof useEditorPage>);

    render(<EditorPage />);
    expect(screen.getByText("↑ 버전 저장")).toBeDisabled();
  });

  it("초대 버튼 클릭 시 setShowInvite(true)가 호출된다", () => {
    render(<EditorPage />);
    fireEvent.click(screen.getByRole("button", { name: "멤버 초대" }));
    expect(mockSetShowInvite).toHaveBeenCalledWith(true);
  });

  it("공유 버튼 클릭 시 setShowShare(true)가 호출된다", () => {
    render(<EditorPage />);
    fireEvent.click(screen.getByText("공유"));
    expect(mockSetShowShare).toHaveBeenCalledWith(true);
  });

  it("파일 메뉴에 마우스 진입/이탈 시 핸들러가 호출된다", () => {
    render(<EditorPage />);
    const wrap = screen.getByText("파일").closest("div")!;
    fireEvent.mouseEnter(wrap);
    expect(mockHandleFileMenuOpen).toHaveBeenCalledOnce();
    fireEvent.mouseLeave(wrap);
    expect(mockHandleFileMenuClose).toHaveBeenCalledOnce();
  });

  it("showFileMenu=false면 파일 드롭다운 메뉴 항목이 보이지 않는다", () => {
    render(<EditorPage />);
    expect(screen.queryByText("가져오기")).not.toBeInTheDocument();
    expect(screen.queryByText("내보내기")).not.toBeInTheDocument();
    expect(screen.queryByText("복사본 저장")).not.toBeInTheDocument();
  });

  describe("showFileMenu=true일 때", () => {
    beforeEach(() => {
      vi.mocked(useEditorModals).mockReturnValue({
        ...baseModalsReturn,
        showFileMenu: true,
      } as ReturnType<typeof useEditorModals>);
    });

    it("가져오기/내보내기/복사본 저장 항목이 보인다", () => {
      render(<EditorPage />);
      expect(screen.getByText("가져오기")).toBeInTheDocument();
      expect(screen.getByText("내보내기")).toBeInTheDocument();
      expect(screen.getByText("복사본 저장")).toBeInTheDocument();
    });

    it("가져오기 클릭 시 handleImportOpen이 호출된다", () => {
      render(<EditorPage />);
      fireEvent.click(screen.getByText("가져오기"));
      expect(mockHandleImportOpen).toHaveBeenCalledOnce();
    });

    it("내보내기 클릭 시 handleExportOpen이 호출된다", () => {
      render(<EditorPage />);
      fireEvent.click(screen.getByText("내보내기"));
      expect(mockHandleExportOpen).toHaveBeenCalledOnce();
    });

    it("복사본 저장 클릭 시 handleSaveCopyOpen이 호출된다", () => {
      render(<EditorPage />);
      fireEvent.click(screen.getByText("복사본 저장"));
      expect(mockHandleSaveCopyOpen).toHaveBeenCalledOnce();
    });

    it("isDuplicating=true면 '복사 중…' 텍스트가 보이고 버튼이 disabled된다", () => {
      vi.mocked(useEditorPage).mockReturnValue({
        ...baseEditorPageReturn,
        isDuplicating: true,
      } as unknown as ReturnType<typeof useEditorPage>);

      render(<EditorPage />);
      expect(screen.getByText("복사 중…")).toBeInTheDocument();
      expect(screen.getByText("복사 중…").closest("button")).toBeDisabled();
    });
  });

  it("selectedRelationshipId와 popoverPos가 모두 있으면 RelationshipPopover를 렌더링한다", () => {
    vi.mocked(useEditorPage).mockReturnValue({
      ...baseEditorPageReturn,
      selectedRelationshipId: "rel-1",
      popoverPos: { x: 10, y: 20 },
    } as unknown as ReturnType<typeof useEditorPage>);

    render(<EditorPage />);
    expect(screen.getByTestId("mock-relationship-popover")).toBeInTheDocument();
  });

  it("selectedRelationshipId가 없으면 RelationshipPopover를 렌더링하지 않는다", () => {
    render(<EditorPage />);
    expect(screen.queryByTestId("mock-relationship-popover")).not.toBeInTheDocument();
  });

  it("diagramId가 있으면 RightSidebar를 렌더링한다", () => {
    render(<EditorPage />);
    expect(screen.getByTestId("mock-right-sidebar")).toBeInTheDocument();
  });

  it("diagramId가 없으면 RightSidebar를 렌더링하지 않는다", () => {
    vi.mocked(useEditorPage).mockReturnValue({
      ...baseEditorPageReturn,
      diagramId: undefined,
    } as unknown as ReturnType<typeof useEditorPage>);

    render(<EditorPage />);
    expect(screen.queryByTestId("mock-right-sidebar")).not.toBeInTheDocument();
  });

  it("showInvite와 organizationId가 있으면 InviteModal을 렌더링한다", () => {
    vi.mocked(useEditorModals).mockReturnValue({
      ...baseModalsReturn,
      showInvite: true,
    } as ReturnType<typeof useEditorModals>);

    render(<EditorPage />);
    expect(screen.getByTestId("mock-invite-modal")).toBeInTheDocument();
  });

  it("showInvite가 true여도 organizationId가 없으면 InviteModal을 렌더링하지 않는다", () => {
    vi.mocked(useEditorModals).mockReturnValue({
      ...baseModalsReturn,
      showInvite: true,
    } as ReturnType<typeof useEditorModals>);
    vi.mocked(useEditorPage).mockReturnValue({
      ...baseEditorPageReturn,
      data: { ...baseEditorPageReturn.data, organizationId: undefined },
    } as unknown as ReturnType<typeof useEditorPage>);

    render(<EditorPage />);
    expect(screen.queryByTestId("mock-invite-modal")).not.toBeInTheDocument();
  });

  it("showSaveCopy, data, diagramId가 모두 있으면 SaveCopyModal을 렌더링한다", () => {
    vi.mocked(useEditorModals).mockReturnValue({
      ...baseModalsReturn,
      showSaveCopy: true,
    } as ReturnType<typeof useEditorModals>);

    render(<EditorPage />);
    expect(screen.getByTestId("mock-save-copy-modal")).toBeInTheDocument();
  });

  it("showSaveCopy가 true여도 diagramId가 없으면 SaveCopyModal을 렌더링하지 않는다", () => {
    vi.mocked(useEditorModals).mockReturnValue({
      ...baseModalsReturn,
      showSaveCopy: true,
    } as ReturnType<typeof useEditorModals>);
    vi.mocked(useEditorPage).mockReturnValue({
      ...baseEditorPageReturn,
      diagramId: undefined,
    } as unknown as ReturnType<typeof useEditorPage>);

    render(<EditorPage />);
    expect(screen.queryByTestId("mock-save-copy-modal")).not.toBeInTheDocument();
  });

  it("ExportModal, ShareDiagramModal, ImportIntoEditorModal은 항상 렌더링된다", () => {
    render(<EditorPage />);
    expect(screen.getByTestId("mock-export-modal")).toBeInTheDocument();
    expect(screen.getByTestId("mock-share-diagram-modal")).toBeInTheDocument();
    expect(screen.getByTestId("mock-import-into-editor-modal")).toBeInTheDocument();
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportDiagramModal } from "./ImportDiagramModal";
import { useDiagramImport } from "@/features/editor/hooks/useDiagramImport";

vi.mock("./ImportDiagramModal.css", () => ({
  tabRow: "", tab: "", tabActive: "",
  nameField: "", fieldLabel: "", textInput: "",
  sectionHeader: "", sectionTitle: "", sectionDesc: "", sqlBrowseRow: "", sqlBrowseBtn: "",
  hintBox: "", hintIcon: "",
  dropzone: "", dropzoneActive: "", dropzoneIcon: "", dropzoneHint: "",
  fileChosenList: "", fileChosen: "", fileChosenName: "", fileClearBtn: "",
  errorText: "", footer: "", cancelBtn: "",
}));

vi.mock("@/features/editor/hooks/useDiagramImport", () => ({
  useDiagramImport: vi.fn(),
}));

const mockedUseDiagramImport = vi.mocked(useDiagramImport);

const makeHookReturn = (overrides: Partial<ReturnType<typeof useDiagramImport>> = {}) => ({
  activeTab: "mysql" as const,
  dialect: "mysql" as const,
  name: "",
  setName: vi.fn(),
  exerdFile: null,
  sqlFiles: [],
  ddlText: "",
  isDragOver: false,
  setIsDragOver: vi.fn(),
  isDdlDragOver: false,
  setIsDdlDragOver: vi.fn(),
  error: null,
  loading: false,
  canSubmit: false,
  fileInputRef: { current: null },
  sqlFileInputRef: { current: null },
  handleTabSwitch: vi.fn(),
  handleDdlChange: vi.fn(),
  acceptSqlFiles: vi.fn(),
  handleSqlFileChange: vi.fn(),
  removeSqlFile: vi.fn(),
  handleExerdDrop: vi.fn(),
  handleExerdFileChange: vi.fn(),
  handleClearExerdFile: vi.fn(),
  handleClose: vi.fn(),
  handleSubmit: vi.fn(),
  ...overrides,
}) as ReturnType<typeof useDiagramImport>;

const defaultProps = {
  open: true,
  projectId: "proj-1",
  onClose: vi.fn(),
  onImported: vi.fn(),
};

describe("ImportDiagramModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseDiagramImport.mockReturnValue(makeHookReturn());
  });

  it("activeTab이 mysql일 때 mysql 탭이 활성화 상태로 렌더링된다", () => {
    mockedUseDiagramImport.mockReturnValue(makeHookReturn({ activeTab: "mysql" }));
    render(<ImportDiagramModal {...defaultProps} />);

    expect(screen.getByRole("button", { name: "MySQL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ExERD 파일" })).toBeInTheDocument();
  });

  it("dialect 탭 버튼 클릭 시 handleTabSwitch가 해당 dialect로 호출된다", () => {
    const hook = makeHookReturn();
    mockedUseDiagramImport.mockReturnValue(hook);
    render(<ImportDiagramModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "PostgreSQL" }));
    expect(hook.handleTabSwitch).toHaveBeenCalledWith("postgresql");
  });

  it("ExERD 탭 클릭 시 handleTabSwitch가 'exerd'로 호출된다", () => {
    const hook = makeHookReturn();
    mockedUseDiagramImport.mockReturnValue(hook);
    render(<ImportDiagramModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "ExERD 파일" }));
    expect(hook.handleTabSwitch).toHaveBeenCalledWith("exerd");
  });

  it("ExERD 탭의 드롭존이 네이티브 button 요소로 렌더링된다", () => {
    // S6819: role/tabIndex를 수동으로 붙인 div 대신 실제 <button>으로 렌더링해
    // 접근성 트리 노출과 키보드 포커스/활성화를 브라우저 네이티브 동작에 맡긴다.
    mockedUseDiagramImport.mockReturnValue(makeHookReturn({ activeTab: "exerd" }));
    render(<ImportDiagramModal {...defaultProps} />);

    const dropzoneBtn = screen.getByRole("button", { name: /클릭하거나 파일을/ });
    expect(dropzoneBtn.tagName).toBe("BUTTON");
  });

  it("드롭존 클릭 시 숨겨진 파일 input의 click이 호출된다", () => {
    mockedUseDiagramImport.mockReturnValue(makeHookReturn({ activeTab: "exerd" }));
    render(<ImportDiagramModal {...defaultProps} />);

    // Modal은 createPortal로 document.body에 렌더링되므로 RTL container가 아닌
    // document에서 실제 input DOM 노드를 조회해, 그 click을 스파이하여 드롭존 버튼과의 연결을 검증한다.
    const fileInput = document.querySelector('input[type="file"][accept=".exerd,.xml"]');
    expect(fileInput).not.toBeNull();
    const clickSpy = vi.spyOn(fileInput as HTMLInputElement, "click").mockImplementation(() => {});

    fireEvent.click(screen.getByRole("button", { name: /클릭하거나 파일을/ }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("다이어그램 이름 입력 시 setName이 호출된다", () => {
    const hook = makeHookReturn();
    mockedUseDiagramImport.mockReturnValue(hook);
    render(<ImportDiagramModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("다이어그램 이름"), { target: { value: "회원 ERD" } });
    expect(hook.setName).toHaveBeenCalledWith("회원 ERD");
  });

  it("canSubmit이 false이면 제출 버튼이 비활성화된다", () => {
    mockedUseDiagramImport.mockReturnValue(makeHookReturn({ canSubmit: false }));
    render(<ImportDiagramModal {...defaultProps} />);

    expect(screen.getByRole("button", { name: /ERD로 변환/ })).toBeDisabled();
  });

  it("canSubmit이 true이면 제출 버튼이 활성화된다", () => {
    mockedUseDiagramImport.mockReturnValue(makeHookReturn({ canSubmit: true }));
    render(<ImportDiagramModal {...defaultProps} />);

    expect(screen.getByRole("button", { name: /ERD로 변환/ })).toBeEnabled();
  });

  it("취소 버튼 클릭 시 handleClose가 호출된다", () => {
    const hook = makeHookReturn();
    mockedUseDiagramImport.mockReturnValue(hook);
    render(<ImportDiagramModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(hook.handleClose).toHaveBeenCalledTimes(1);
  });

  it("제출 버튼 클릭 시 handleSubmit이 호출된다", () => {
    const hook = makeHookReturn({ canSubmit: true });
    mockedUseDiagramImport.mockReturnValue(hook);
    render(<ImportDiagramModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /ERD로 변환/ }));
    expect(hook.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("error가 있으면 에러 메시지를 렌더링한다", () => {
    mockedUseDiagramImport.mockReturnValue(makeHookReturn({ error: "다이어그램 이름을 입력하세요." }));
    render(<ImportDiagramModal {...defaultProps} />);

    expect(screen.getByText("다이어그램 이름을 입력하세요.")).toBeInTheDocument();
  });
});

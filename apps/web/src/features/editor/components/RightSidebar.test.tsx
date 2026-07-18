import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { RightSidebar } from "./RightSidebar";

vi.mock("./right-sidebar.css", () => ({
  container: "",
  resizeHandle: "",
  resizeHandleActive: "",
  panel: "",
  panelResizing: "",
  panelClosed: "",
  panelBody: "",
  tabBar: "",
  tabBtn: { default: "", active: "" },
  tabIcon: "",
  tabLabel: "",
  tabSep: "",
  placeholderPanel: "",
  panelHeader: "",
  panelTitle: "",
}));

vi.mock("./AIChatTabPanel", () => ({
  AIChatTabPanel: () => <div data-testid="mock-ai-panel" />,
}));
vi.mock("./HistoryTabPanel", () => ({
  HistoryTabPanel: () => <div data-testid="mock-history-panel" />,
}));
vi.mock("./ObjectsTabPanel", () => ({
  ObjectsTabPanel: () => <div data-testid="mock-objects-panel" />,
}));
vi.mock("./SearchTabPanel", () => ({
  SearchTabPanel: () => <div data-testid="mock-search-panel" />,
}));

vi.mock("@/features/editor/store/useEditorStore", () => ({
  useEditorStore: vi.fn(),
}));

interface FakeState {
  rightSidebarActiveTab: number;
  rightSidebarPanelOpen: boolean;
  rightSidebarWidth: number;
  setRightSidebarActiveTab: ReturnType<typeof vi.fn>;
  setRightSidebarPanelOpen: ReturnType<typeof vi.fn>;
  setRightSidebarWidth: ReturnType<typeof vi.fn>;
}

const makeState = (overrides: Partial<FakeState> = {}): FakeState => ({
  rightSidebarActiveTab: 0,
  rightSidebarPanelOpen: false,
  rightSidebarWidth: 280,
  setRightSidebarActiveTab: vi.fn(),
  setRightSidebarPanelOpen: vi.fn(),
  setRightSidebarWidth: vi.fn(),
  ...overrides,
});

const mockStore = (state: FakeState) => {
  vi.mocked(useEditorStore).mockImplementation(((selector: (s: FakeState) => unknown) =>
    selector(state)) as unknown as typeof useEditorStore);
};

describe("RightSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AI/검색/기록/객체 4개 탭 버튼을 aria-label과 함께 렌더링한다", () => {
    mockStore(makeState());
    render(<RightSidebar diagramId="d1" />);

    expect(screen.getByRole("button", { name: "AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "검색" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "객체" })).toBeInTheDocument();
  });

  it("닫혀 있는 탭을 클릭하면 setActiveTab과 setPanelOpen(true)이 호출된다", () => {
    const state = makeState({ rightSidebarPanelOpen: false, rightSidebarActiveTab: 0 });
    mockStore(state);
    render(<RightSidebar diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(state.setRightSidebarActiveTab).toHaveBeenCalledWith(1);
    expect(state.setRightSidebarPanelOpen).toHaveBeenCalledWith(true);
  });

  it("이미 열려 있는 활성 탭을 다시 클릭하면 setPanelOpen(false)가 호출된다(collapse)", () => {
    const state = makeState({ rightSidebarPanelOpen: true, rightSidebarActiveTab: 0 });
    mockStore(state);
    render(<RightSidebar diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: "AI" }));

    expect(state.setRightSidebarPanelOpen).toHaveBeenCalledWith(false);
    expect(state.setRightSidebarActiveTab).not.toHaveBeenCalled();
  });

  it("panelOpen이 true이면 리사이즈 핸들이 올바른 a11y 속성으로 렌더링된다", () => {
    mockStore(makeState({ rightSidebarPanelOpen: true, rightSidebarWidth: 340 }));
    render(<RightSidebar diagramId="d1" />);

    const handle = screen.getByRole("separator");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuenow", "340");
    expect(handle).toHaveAttribute("aria-valuemin", "240");
    expect(handle).toHaveAttribute("aria-valuemax", "720");
    expect(handle).toHaveAttribute("tabIndex", "0");
  });

  it("panelOpen이 false이면 리사이즈 핸들이 렌더링되지 않는다", () => {
    mockStore(makeState({ rightSidebarPanelOpen: false }));
    render(<RightSidebar diagramId="d1" />);

    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("리사이즈 핸들에서 ArrowLeft를 누르면 setPanelWidth(width + 20)이 호출된다", () => {
    const state = makeState({ rightSidebarPanelOpen: true, rightSidebarWidth: 300 });
    mockStore(state);
    render(<RightSidebar diagramId="d1" />);

    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" });

    expect(state.setRightSidebarWidth).toHaveBeenCalledWith(320);
  });

  it("리사이즈 핸들에서 ArrowRight를 누르면 setPanelWidth(width - 20)이 호출된다", () => {
    const state = makeState({ rightSidebarPanelOpen: true, rightSidebarWidth: 300 });
    mockStore(state);
    render(<RightSidebar diagramId="d1" />);

    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });

    expect(state.setRightSidebarWidth).toHaveBeenCalledWith(280);
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { McpActivityDrawer } from "./McpActivityDrawer";
import { useMcpActivity } from "../hooks/useMcpActivity";
import type { McpSessionResponse } from "../../../shared/api/mcp-sessions.api";

vi.mock("../hooks/useMcpActivity");
vi.mock("./mcp-activity-drawer.css", () => ({
  drawer: "",
  drawerHeader: "",
  drawerTitleGroup: "",
  drawerTitle: "",
  newBadge: "",
  closeBtn: "",
  drawerBody: "",
  emptyText: "",
  sessionItem: "",
  sessionItemNew: "",
  sessionTimestamp: "",
  sessionTimestampNew: "",
  newDot: "",
  newTimestampText: "",
  sessionSummary: "",
  sessionSummaryOld: "",
  toolCallList: "",
  toolCallItem: "",
  sessionActions: "",
  toggleBtn: "",
  spacer: "",
  revertBtn: "",
}));

const mockRevertSession = vi.fn();

const sampleSession: McpSessionResponse = {
  id: "sess-1",
  summary: "테이블 추가",
  toolCalls: [{ tool: "createTable", summary: "users 테이블 생성" }],
  snapshotVersionId: "v-1",
  createdAt: new Date(Date.now() - 60000).toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("McpActivityDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMcpActivity).mockReturnValue({
      sessions: [],
      isLoading: false,
      revertSession: mockRevertSession,
      isReverting: false,
    });
  });

  it('shows "불러오는 중…" when loading', () => {
    vi.mocked(useMcpActivity).mockReturnValue({
      sessions: [],
      isLoading: true,
      revertSession: mockRevertSession,
      isReverting: false,
    });
    render(<McpActivityDrawer diagramId="d-1" seenAt={null} onClose={vi.fn()} />);
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
  });

  it('shows "AI 활동 기록이 없습니다." when sessions is empty', () => {
    render(<McpActivityDrawer diagramId="d-1" seenAt={null} onClose={vi.fn()} />);
    expect(screen.getByText("AI 활동 기록이 없습니다.")).toBeInTheDocument();
  });

  it("shows session summary when sessions are provided", () => {
    vi.mocked(useMcpActivity).mockReturnValue({
      sessions: [sampleSession],
      isLoading: false,
      revertSession: mockRevertSession,
      isReverting: false,
    });
    render(<McpActivityDrawer diagramId="d-1" seenAt={null} onClose={vi.fn()} />);
    expect(screen.getByText("테이블 추가")).toBeInTheDocument();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<McpActivityDrawer diagramId="d-1" seenAt={null} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("닫기"));
    expect(onClose).toHaveBeenCalled();
  });

  it('"되돌리기" with window.confirm returning true calls revertSession', () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(useMcpActivity).mockReturnValue({
      sessions: [sampleSession],
      isLoading: false,
      revertSession: mockRevertSession,
      isReverting: false,
    });
    render(<McpActivityDrawer diagramId="d-1" seenAt={null} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("되돌리기"));
    expect(mockRevertSession).toHaveBeenCalledWith("sess-1");
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HistoryTabPanel } from "./HistoryTabPanel";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { useActivityFeed } from "@/features/editor/hooks/useActivityFeed";
import type {
  UseActivityFeedResult,
  VersionActivityItem,
  AiActivityItem,
} from "@/features/editor/hooks/useActivityFeed";
import type { EditorState } from "@/features/editor/store/editor-store.types";

vi.mock("./activity-drawer.css", () => ({
  drawer: "",
  drawerHeader: "",
  drawerTitle: "",
  closeBtn: "",
  filterRow: "filterRow",
  chip: "chip",
  chipOn: "chipOn",
  chipDot: "chipDot",
  drawerBody: "drawerBody",
  emptyText: "emptyText",
  activityItem: "activityItem",
  itemIcon: "itemIcon",
  itemIconHuman: "itemIconHuman",
  itemIconAi: "itemIconAi",
  itemBody: "itemBody",
  itemSummary: "itemSummary",
  itemMeta: "itemMeta",
  itemRevertBtn: "itemRevertBtn",
}));

vi.mock("@/features/editor/store/useEditorStore");
vi.mock("@/features/editor/hooks/useActivityFeed", () => ({
  useActivityFeed: vi.fn(),
}));

const mockedUseActivityFeed = vi.mocked(useActivityFeed);

const setupEditorStore = (isDirty = false) => {
  vi.mocked(useEditorStore).mockImplementation((selector: (s: EditorState) => unknown) =>
    selector({ isDirty } as unknown as EditorState)
  );
};

const makeVersionItem = (overrides: Partial<VersionActivityItem> = {}): VersionActivityItem => ({
  kind: "version",
  id: "v1",
  diagramId: "d1",
  content: {} as VersionActivityItem["content"],
  revision: 3,
  createdBy: "u1",
  createdByName: "김민준",
  createdAt: "2026-07-18T11:59:30.000Z",
  ...overrides,
});

const makeAiItem = (overrides: Partial<AiActivityItem> = {}): AiActivityItem => ({
  kind: "ai",
  id: "s1",
  summary: "테이블 3개를 추가했습니다",
  toolCalls: [],
  snapshotVersionId: "v0",
  createdAt: "2026-07-18T11:59:30.000Z",
  updatedAt: "2026-07-18T11:59:30.000Z",
  ...overrides,
});

const makeFeedReturn = (
  overrides: Partial<UseActivityFeedResult> = {}
): UseActivityFeedResult => ({
  items: [],
  isLoading: false,
  restoreVersion: vi.fn(),
  isRestoring: false,
  revertSession: vi.fn(),
  isReverting: false,
  ...overrides,
});

const setupFeed = (overrides: Partial<UseActivityFeedResult> = {}) => {
  const value = makeFeedReturn(overrides);
  mockedUseActivityFeed.mockReturnValue(value);
  return value;
};

describe("HistoryTabPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T12:00:00.000Z"));
    setupEditorStore(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("로딩 중이면 로딩 텍스트를 표시한다", () => {
    setupFeed({ isLoading: true, items: [makeVersionItem()] });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
  });

  it("항목이 없으면 빈 상태 텍스트를 표시한다", () => {
    setupFeed({ items: [] });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("표시할 활동이 없습니다.")).toBeInTheDocument();
  });

  it("버전 항목은 리비전 번호, 작성자, 상대 시간, 복원 버튼을 렌더링한다", () => {
    setupFeed({
      items: [
        makeVersionItem({
          revision: 5,
          createdByName: "김민준",
          createdAt: "2026-07-18T11:59:30.000Z", // 30초 전 → 방금 전
        }),
      ],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("v5 버전 저장")).toBeInTheDocument();
    expect(screen.getByText("김민준 · 방금 전")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복원" })).toBeInTheDocument();
  });

  it("생성 시각이 1분 미만이면 '방금 전'을, 1시간 미만이면 'N분 전'을 표시한다", () => {
    setupFeed({
      items: [
        makeVersionItem({ id: "v1", createdAt: "2026-07-18T11:45:00.000Z" }), // 15분 전
      ],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("김민준 · 15분 전")).toBeInTheDocument();
  });

  it("생성 시각이 정확히 하루 전이면 '어제'를 표시한다", () => {
    setupFeed({
      items: [makeVersionItem({ id: "v1", createdAt: "2026-07-17T12:00:00.000Z" })],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("김민준 · 어제")).toBeInTheDocument();
  });

  it("생성 시각이 2~6일 전이면 'N일 전'을 표시한다", () => {
    setupFeed({
      items: [makeVersionItem({ id: "v1", createdAt: "2026-07-15T12:00:00.000Z" })],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("김민준 · 3일 전")).toBeInTheDocument();
  });

  it("생성 시각이 7일 이상 지났으면 로케일 날짜 문자열을 표시한다", () => {
    const createdAt = "2026-07-01T12:00:00.000Z";
    setupFeed({
      items: [makeVersionItem({ id: "v1", createdAt })],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    const expected = new Date(createdAt).toLocaleDateString("ko-KR");
    expect(screen.getByText(`김민준 · ${expected}`)).toBeInTheDocument();
  });

  it("버전 항목 작성자명이 없으면 아이콘에 '?'를 표시한다", () => {
    setupFeed({ items: [makeVersionItem({ id: "v1", createdByName: "" })] });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("AI 세션 항목은 summary와 되돌리기 버튼을 렌더링한다 (snapshotVersionId 존재)", () => {
    setupFeed({
      items: [
        makeAiItem({
          summary: "컬럼 타입을 수정했습니다",
          snapshotVersionId: "v2",
          createdAt: "2026-07-18T09:00:00.000Z", // 3시간 전
        }),
      ],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("컬럼 타입을 수정했습니다")).toBeInTheDocument();
    expect(screen.getByText("AI · 3시간 전")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "되돌리기" })).toBeInTheDocument();
  });

  it("AI 세션 항목은 summary가 없으면 'AI 활동'으로 대체 표시한다", () => {
    setupFeed({ items: [makeAiItem({ summary: null })] });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("AI 활동")).toBeInTheDocument();
  });

  it("AI 세션 항목은 snapshotVersionId가 null이면 되돌리기 버튼을 렌더링하지 않는다", () => {
    setupFeed({ items: [makeAiItem({ snapshotVersionId: null })] });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.queryByRole("button", { name: "되돌리기" })).not.toBeInTheDocument();
  });

  it("사람 필터를 끄면 버전 항목이 숨겨지고 AI 항목만 남는다", () => {
    setupFeed({
      items: [
        makeVersionItem({ id: "v1", revision: 1 }),
        makeAiItem({ id: "s1", summary: "AI 세션" }),
      ],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByText("v1 버전 저장")).toBeInTheDocument();
    expect(screen.getByText("AI 세션")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /사람/ }));

    expect(screen.queryByText("v1 버전 저장")).not.toBeInTheDocument();
    expect(screen.getByText("AI 세션")).toBeInTheDocument();
  });

  it("AI 필터를 끄면 AI 항목이 숨겨지고 버전 항목만 남는다", () => {
    setupFeed({
      items: [
        makeVersionItem({ id: "v1", revision: 1 }),
        makeAiItem({ id: "s1", summary: "AI 세션" }),
      ],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: /^AI/ }));

    expect(screen.getByText("v1 버전 저장")).toBeInTheDocument();
    expect(screen.queryByText("AI 세션")).not.toBeInTheDocument();
  });

  it("모든 필터를 끄면 빈 상태 텍스트가 표시된다", () => {
    setupFeed({
      items: [makeVersionItem({ id: "v1" }), makeAiItem({ id: "s1" })],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: /사람/ }));
    fireEvent.click(screen.getByRole("button", { name: /^AI/ }));

    expect(screen.getByText("표시할 활동이 없습니다.")).toBeInTheDocument();
  });

  it("필터 칩을 켜고 끄면 활성 스타일(chipOn)이 토글된다", () => {
    setupFeed({ items: [] });
    render(<HistoryTabPanel diagramId="d1" />);

    const humanChip = screen.getByRole("button", { name: /사람/ });
    expect(humanChip.className).toContain("chipOn");

    fireEvent.click(humanChip);
    expect(humanChip.className).not.toContain("chipOn");
  });

  it("변경사항이 없으면(isDirty=false) 복원 버튼 클릭 시 확인창 없이 바로 restoreVersion이 호출된다", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const feed = setupFeed({ items: [makeVersionItem({ id: "v1" })] });
    setupEditorStore(false);
    render(<HistoryTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: "복원" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(feed.restoreVersion).toHaveBeenCalledWith("v1");
  });

  it("변경사항이 있으면(isDirty=true) 확인창에서 확인을 누른 경우에만 restoreVersion이 호출된다", () => {
    const feed = setupFeed({ items: [makeVersionItem({ id: "v1" })] });
    setupEditorStore(true);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<HistoryTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: "복원" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(feed.restoreVersion).toHaveBeenCalledWith("v1");
  });

  it("변경사항이 있고(isDirty=true) 확인창에서 취소하면 restoreVersion이 호출되지 않는다", () => {
    const feed = setupFeed({ items: [makeVersionItem({ id: "v1" })] });
    setupEditorStore(true);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<HistoryTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: "복원" }));

    expect(feed.restoreVersion).not.toHaveBeenCalled();
  });

  it("되돌리기 버튼 클릭 시 확인창에서 확인을 누르면 revertSession이 호출된다", () => {
    const feed = setupFeed({
      items: [makeAiItem({ id: "s1", snapshotVersionId: "v2" })],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<HistoryTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    expect(feed.revertSession).toHaveBeenCalledWith("s1");
  });

  it("되돌리기 버튼 클릭 시 확인창에서 취소하면 revertSession이 호출되지 않는다", () => {
    const feed = setupFeed({
      items: [makeAiItem({ id: "s1", snapshotVersionId: "v2" })],
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<HistoryTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    expect(feed.revertSession).not.toHaveBeenCalled();
  });

  it("isRestoring이 true이면 복원 버튼이 비활성화된다", () => {
    setupFeed({ items: [makeVersionItem({ id: "v1" })], isRestoring: true });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByRole("button", { name: "복원" })).toBeDisabled();
  });

  it("isReverting이 true이면 되돌리기 버튼이 비활성화된다", () => {
    setupFeed({
      items: [makeAiItem({ id: "s1", snapshotVersionId: "v2" })],
      isReverting: true,
    });
    render(<HistoryTabPanel diagramId="d1" />);

    expect(screen.getByRole("button", { name: "되돌리기" })).toBeDisabled();
  });

  it("모든 button 요소는 type=button 속성을 갖는다", () => {
    setupFeed({
      items: [makeVersionItem({ id: "v1" }), makeAiItem({ id: "s1", snapshotVersionId: "v2" })],
    });
    render(<HistoryTabPanel diagramId="d1" />);

    screen.getAllByRole("button").forEach((btn) => {
      expect(btn).toHaveAttribute("type", "button");
    });
  });
});

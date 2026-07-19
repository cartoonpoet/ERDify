import React from "react";
import type * as XYFlowModule from "@xyflow/react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/useEditorStore";
import { addEntity, updateEntityPosition } from "@erdify/domain";
import { computeAutoLayout } from "@/shared/utils/canvas-layout";

vi.mock("@/features/editor/store/useEditorStore");

const mockScreenToFlowPosition = vi.fn();
const mockFitView = vi.fn();
const mockGetNodes = vi.fn();
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof XYFlowModule>();
  return {
    ...actual,
    useReactFlow: vi.fn(() => ({
      screenToFlowPosition: mockScreenToFlowPosition,
      fitView: mockFitView,
      getNodes: mockGetNodes,
    })),
  };
});

vi.mock("@erdify/domain", () => ({
  addEntity: vi.fn((doc, input) => ({
    ...doc,
    entities: [...doc.entities, { id: input.id, name: input.name, columns: [] }],
  })),
  updateEntityPosition: vi.fn((doc) => doc),
}));

vi.mock("@/shared/utils/uuid", () => ({ randomUUID: vi.fn(() => "new-entity-id") }));

vi.mock("@/shared/utils/canvas-layout", () => ({
  computeAutoLayout: vi.fn(() => ({
    e1: { x: 10, y: 20 },
    e2: { x: 30, y: 40 },
  })),
}));

vi.mock("./canvas-context-menu.css", () => ({
  menu: "",
  menuItem: "",
  iconLg: "",
  iconSm: "",
  separator: "",
}));

const sampleDoc = {
  entities: [
    { id: "e1", name: "Users", columns: [] },
    { id: "e2", name: "Orders", columns: [] },
  ],
};

const mockApplyCommand = vi.fn();
const mockSetGroupViewEnabled = vi.fn();

const setupStoreMock = (
  overrides: {
    document?: typeof sampleDoc | null;
    groupViewEnabled?: boolean;
  } = {},
) => {
  const { document = sampleDoc, groupViewEnabled = false } = overrides;
  vi.mocked(useEditorStore).mockImplementation(((selector: (s: EditorState) => unknown) =>
    selector({
      document,
      applyCommand: mockApplyCommand,
      groupViewEnabled,
      setGroupViewEnabled: mockSetGroupViewEnabled,
    } as unknown as EditorState)) as unknown as typeof useEditorStore);
};

const defaultProps = {
  menuX: 50,
  menuY: 60,
  clientX: 100,
  clientY: 120,
};

describe("CanvasContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScreenToFlowPosition.mockReturnValue({ x: 111, y: 222 });
    mockGetNodes.mockReturnValue([
      { id: "e1", measured: { width: 300, height: 150 } },
      { id: "e2" },
    ]);
    setupStoreMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("document가 없으면 아무것도 렌더링하지 않는다", () => {
    setupStoreMock({ document: null });
    const onClose = vi.fn();
    const { container } = render(<CanvasContextMenu {...defaultProps} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("document가 있으면 메뉴 항목들을 지정된 위치에 렌더링한다", () => {
    const { container } = render(<CanvasContextMenu {...defaultProps} onClose={vi.fn()} />);
    expect(screen.getByText("테이블 추가")).toBeInTheDocument();
    expect(screen.getByText("테이블 자동 정렬")).toBeInTheDocument();
    expect(screen.getByText("그룹 보기")).toBeInTheDocument();

    const menuDiv = container.firstChild as HTMLElement;
    expect(menuDiv).toHaveStyle({ left: "50px", top: "60px" });
  });

  it("groupViewEnabled가 true면 '그룹 숨기기'가 표시된다", () => {
    setupStoreMock({ groupViewEnabled: true });
    render(<CanvasContextMenu {...defaultProps} onClose={vi.fn()} />);
    expect(screen.getByText("그룹 숨기기")).toBeInTheDocument();
    expect(screen.queryByText("그룹 보기")).not.toBeInTheDocument();
  });

  it("'테이블 추가' 클릭 시 새 엔티티를 추가하고 onClose를 호출한다", () => {
    const onClose = vi.fn();
    render(<CanvasContextMenu {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("테이블 추가"));

    expect(mockScreenToFlowPosition).toHaveBeenCalledWith({ x: 100, y: 120 });
    expect(mockApplyCommand).toHaveBeenCalledTimes(1);

    const updater = mockApplyCommand.mock.calls[0]![0] as (doc: typeof sampleDoc) => unknown;
    const result = updater(sampleDoc);

    expect(addEntity).toHaveBeenCalledWith(sampleDoc, { id: "new-entity-id", name: "Table_3" });
    expect(updateEntityPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([{ id: "new-entity-id", name: "Table_3", columns: [] }]),
      }),
      "new-entity-id",
      { x: 111, y: 222 },
    );
    expect(result).toBeDefined();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("'테이블 자동 정렬' 클릭 시 자동 배치를 적용하고 onClose를 호출한다", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<CanvasContextMenu {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("테이블 자동 정렬"));

    expect(mockGetNodes).toHaveBeenCalled();
    expect(computeAutoLayout).toHaveBeenCalledWith(
      sampleDoc,
      new Map([
        ["e1", { w: 300, h: 150 }],
        ["e2", { w: 280, h: 120 }],
      ]),
    );
    expect(mockApplyCommand).toHaveBeenCalledTimes(1);

    const updater = mockApplyCommand.mock.calls[0]![0] as (doc: typeof sampleDoc) => unknown;
    updater(sampleDoc);

    expect(updateEntityPosition).toHaveBeenCalledWith(sampleDoc, "e1", { x: 10, y: 20 });
    expect(updateEntityPosition).toHaveBeenCalledWith(sampleDoc, "e2", { x: 30, y: 40 });

    expect(mockFitView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(mockFitView).toHaveBeenCalledWith({ duration: 400, padding: 0.08 });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("'그룹 보기' 클릭 시 setGroupViewEnabled(true)를 호출하고 onClose를 호출한다", () => {
    const onClose = vi.fn();
    render(<CanvasContextMenu {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("그룹 보기"));

    expect(mockSetGroupViewEnabled).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("'그룹 숨기기' 클릭 시 setGroupViewEnabled(false)를 호출한다", () => {
    setupStoreMock({ groupViewEnabled: true });
    const onClose = vi.fn();
    render(<CanvasContextMenu {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("그룹 숨기기"));

    expect(mockSetGroupViewEnabled).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

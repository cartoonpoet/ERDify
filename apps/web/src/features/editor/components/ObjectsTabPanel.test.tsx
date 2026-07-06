import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ObjectsTabPanel } from "./ObjectsTabPanel";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/editor-store.types";
import type { DiagramObject } from "@erdify/domain";

vi.mock("@/features/editor/store/useEditorStore");

vi.mock("@/shared/utils/uuid", () => ({ randomUUID: vi.fn(() => "new-object-id") }));

vi.mock("./objects-tab-panel.css", () => ({
  container: "",
  filterRow: "",
  chip: "chip",
  chipOn: "chipOn",
  chipDot: "",
  listBody: "",
  emptyText: "emptyText",
  objectRow: "objectRow",
  kindBadge: {
    procedure: "kindBadge-procedure",
    function: "kindBadge-function",
    trigger: "kindBadge-trigger",
    view: "kindBadge-view",
  },
  objectName: "",
  addRow: "",
  addBtn: "",
}));

const mockModal = vi.fn();
vi.mock("./ObjectEditModal", () => ({
  ObjectEditModal: (props: { object: DiagramObject; mode: "add" | "edit"; onClose: () => void }) => {
    mockModal(props);
    return <div data-testid="object-edit-modal">{props.mode}</div>;
  },
}));

const makeObj = (o: Partial<DiagramObject> = {}): DiagramObject => ({
  id: "o1",
  kind: "procedure",
  name: "sp_x",
  sql: "CREATE PROCEDURE sp_x() BEGIN END;",
  ...o,
});

const setupStore = (objects: DiagramObject[] = [], canEdit = true) => {
  vi.mocked(useEditorStore).mockImplementation((selector: (s: EditorState) => unknown) =>
    selector({
      document: { objects },
      canEdit,
    } as unknown as EditorState)
  );
};

describe("ObjectsTabPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("objects가 비어있으면 빈 상태 텍스트를 표시한다", () => {
    setupStore([]);
    render(<ObjectsTabPanel diagramId="d1" />);

    expect(screen.getByText("아직 저장된 객체가 없습니다.")).toBeInTheDocument();
  });

  it("여러 objects가 있으면 이름과 종류 뱃지 목록을 렌더한다", () => {
    setupStore([
      makeObj({ id: "o1", kind: "procedure", name: "sp_a" }),
      makeObj({ id: "o2", kind: "trigger", name: "trg_b" }),
    ]);
    render(<ObjectsTabPanel diagramId="d1" />);

    expect(screen.getByText("sp_a")).toBeInTheDocument();
    expect(screen.getByText("trg_b")).toBeInTheDocument();
    expect(screen.getAllByText("프로시저").length).toBeGreaterThan(0);
    expect(screen.getAllByText("트리거").length).toBeGreaterThan(0);
  });

  it("종류 필터칩을 끄면 해당 kind가 아닌 항목만 남긴다", () => {
    setupStore([
      makeObj({ id: "o1", kind: "procedure", name: "sp_a" }),
      makeObj({ id: "o2", kind: "trigger", name: "trg_b" }),
    ]);
    render(<ObjectsTabPanel diagramId="d1" />);

    // 필터칩은 정확히 "프로시저"/"함수"/"뷰" 텍스트만을 accessible name으로 갖는다
    // (행 버튼은 "종류뱃지+이름" 텍스트가 합쳐져 정확히 일치하지 않는다).
    fireEvent.click(screen.getByRole("button", { name: "프로시저" }));
    fireEvent.click(screen.getByRole("button", { name: "함수" }));
    fireEvent.click(screen.getByRole("button", { name: "뷰" }));

    expect(screen.queryByText("sp_a")).not.toBeInTheDocument();
    expect(screen.getByText("trg_b")).toBeInTheDocument();
  });

  it("＋ 객체 추가 클릭 시 편집 모달을 add 모드로 오픈한다", () => {
    setupStore([]);
    render(<ObjectsTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByText("＋ 객체 추가"));

    expect(screen.getByTestId("object-edit-modal")).toBeInTheDocument();
    expect(mockModal).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "add",
        object: expect.objectContaining({ id: "new-object-id", kind: "procedure", name: "", sql: "" }),
      })
    );
  });

  it("항목 클릭 시 편집 모달을 edit 모드로 해당 객체와 함께 오픈한다", () => {
    const target = makeObj({ id: "o1", kind: "view", name: "v_report" });
    setupStore([target]);
    render(<ObjectsTabPanel diagramId="d1" />);

    fireEvent.click(screen.getByText("v_report"));

    expect(mockModal).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "edit", object: target })
    );
  });

  it("canEdit이 false면 ＋ 객체 추가 버튼이 비활성화된다", () => {
    setupStore([], false);
    render(<ObjectsTabPanel diagramId="d1" />);

    expect(screen.getByText("＋ 객체 추가").closest("button")).toBeDisabled();
  });
});

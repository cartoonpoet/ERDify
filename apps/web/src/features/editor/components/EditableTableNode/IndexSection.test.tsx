import { render, screen, fireEvent } from "@testing-library/react";
import { IndexSection } from "./IndexSection";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/editor-store.types";
import type { DiagramColumn, DiagramDocument, DiagramIndex } from "@erdify/domain";

vi.mock("@/features/editor/store/useEditorStore");

vi.mock("./editable-table-node.css", () => ({
  indexSection: "",
  indexSectionHeader: "",
  indexSectionLabel: "",
  indexAddBtn: "",
  indexRow: "",
  indexNameInput: "",
  indexUniqueToggle: "",
  // unique 여부에 따른 active 클래스 적용 여부를 검증해야 하므로, 이 클래스만 식별 가능한 값으로 목킹한다.
  indexUniqueActive: "indexUniqueActive",
  indexDeleteBtn: "",
  emptyIndexText: "",
  indexColWrapper: "",
  indexColsBtn: "",
  indexColsBackdrop: "",
  indexColsDropdown: "",
  indexColOption: "",
  indexColCheckbox: "",
  indexColEmpty: "",
}));

const mockApplyCommand = vi.fn();

const setupStore = () => {
  vi.mocked(useEditorStore).mockImplementation((selector: (s: EditorState) => unknown) =>
    selector({ applyCommand: mockApplyCommand } as unknown as EditorState)
  );
};

const makeColumn = (overrides: Partial<DiagramColumn> = {}): DiagramColumn => ({
  id: "col-1",
  name: "user_id",
  type: "int",
  nullable: true,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal: 0,
  ...overrides,
});

const columns: DiagramColumn[] = [
  makeColumn({ id: "col-1", name: "user_id" }),
  makeColumn({ id: "col-2", name: "created_at" }),
];

const makeIdx = (overrides: Partial<DiagramIndex> = {}): DiagramIndex => ({
  id: "idx-1",
  entityId: "ent-1",
  name: "idx_users_user_id",
  columnIds: ["col-1"],
  unique: false,
  ...overrides,
});

// @erdify/domain은 mock하지 않는다: IndexSection이 넘기는 updater 함수는 실제
// addIndex/updateIndex/removeIndex(도메인 dist)를 그대로 호출하므로, applyCommand에
// 전달된 updater를 최소 doc에 적용해 도메인 연동까지 검증한다.
const sampleDoc = (indexes: DiagramIndex[] = []): DiagramDocument =>
  ({ indexes } as unknown as DiagramDocument);

const runUpdater = (callIndex: number, indexes: DiagramIndex[] = []) => {
  const updater = mockApplyCommand.mock.calls[callIndex]![0] as (
    doc: DiagramDocument
  ) => DiagramDocument;
  return updater(sampleDoc(indexes));
};

describe("IndexSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it("헤더에 'Indexes' 라벨과 추가 버튼을 렌더링한다", () => {
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[]}
      />
    );

    expect(screen.getByText("Indexes")).toBeInTheDocument();
    expect(screen.getByLabelText("인덱스 추가")).toHaveTextContent("+ 추가");
  });

  it("entityIndexes가 비어 있으면 '인덱스 없음' 안내 문구를 렌더링하고 행은 없다", () => {
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[]}
      />
    );

    expect(screen.getByText("인덱스 없음")).toBeInTheDocument();
    expect(screen.queryByLabelText("인덱스명")).not.toBeInTheDocument();
  });

  it("추가 버튼을 클릭하면 applyCommand가 호출되고, entityId/entityName 기반의 새 인덱스가 추가된다", () => {
    render(
      <IndexSection
        entityId="ent-1"
        entityName="My Table"
        entityColumns={columns}
        entityIndexes={[]}
      />
    );

    fireEvent.click(screen.getByLabelText("인덱스 추가"));

    expect(mockApplyCommand).toHaveBeenCalledTimes(1);
    const result = runUpdater(0, []);
    expect(result.indexes).toHaveLength(1);
    expect(result.indexes[0]).toMatchObject({
      entityId: "ent-1",
      name: "idx_my_table",
      columnIds: [],
      unique: false,
    });
  });

  it("entityIndexes 각각에 대해 이름 입력, 컬럼 선택, unique 토글, 삭제 버튼을 렌더링한다", () => {
    const idx = makeIdx({ name: "idx_a", unique: false });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idx]}
      />
    );

    expect(screen.getByLabelText("인덱스명")).toHaveValue("idx_a");
    expect(screen.getByLabelText("컬럼 선택: user_id")).toBeInTheDocument();
    expect(screen.getByLabelText("일반 인덱스 (클릭하면 UNIQUE로 변경)")).toHaveTextContent("INDEX");
    expect(screen.getByLabelText("idx_a 삭제")).toBeInTheDocument();
  });

  it("unique가 true인 인덱스는 UNIQUE 라벨과 active 클래스를 갖는다", () => {
    const idx = makeIdx({ name: "idx_b", unique: true });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idx]}
      />
    );

    const toggleBtn = screen.getByLabelText("UNIQUE 인덱스 (클릭하면 일반 인덱스로 변경)");
    expect(toggleBtn).toHaveTextContent("UNIQUE");
    expect(toggleBtn.className).toContain("indexUniqueActive");
    expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("unique가 false인 인덱스는 active 클래스가 없다", () => {
    const idx = makeIdx({ name: "idx_c", unique: false });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idx]}
      />
    );

    const toggleBtn = screen.getByLabelText("일반 인덱스 (클릭하면 UNIQUE로 변경)");
    expect(toggleBtn.className).not.toContain("indexUniqueActive");
    expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("삭제 버튼의 aria-label에 인덱스명이 없으면 '인덱스'로 대체된다", () => {
    const idx = makeIdx({ name: "" });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idx]}
      />
    );

    expect(screen.getByLabelText("인덱스 삭제")).toBeInTheDocument();
  });

  it("이름 입력을 변경하면 applyCommand가 호출되고 updateIndex로 name이 갱신된다", () => {
    const idx = makeIdx({ name: "idx_old" });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idx]}
      />
    );

    fireEvent.input(screen.getByLabelText("인덱스명"), { target: { value: "idx_new" } });

    expect(mockApplyCommand).toHaveBeenCalledTimes(1);
    const result = runUpdater(0, [idx]);
    expect(result.indexes[0]).toMatchObject({ id: "idx-1", name: "idx_new" });
  });

  it("컬럼 선택 체크박스를 변경하면 applyCommand가 호출되고 updateIndex로 columnIds가 갱신된다", () => {
    const idx = makeIdx({ columnIds: ["col-1"] });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idx]}
      />
    );

    fireEvent.click(screen.getByLabelText("컬럼 선택: user_id"));
    const [, secondCheckbox] = screen.getAllByRole("checkbox");
    fireEvent.click(secondCheckbox!);

    expect(mockApplyCommand).toHaveBeenCalledTimes(1);
    const result = runUpdater(0, [idx]);
    expect(result.indexes[0]).toMatchObject({ id: "idx-1", columnIds: ["col-1", "col-2"] });
  });

  it("unique 토글 버튼을 클릭하면 applyCommand가 호출되고 unique가 반전된다", () => {
    const idx = makeIdx({ unique: false });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idx]}
      />
    );

    fireEvent.click(screen.getByLabelText("일반 인덱스 (클릭하면 UNIQUE로 변경)"));

    expect(mockApplyCommand).toHaveBeenCalledTimes(1);
    const result = runUpdater(0, [idx]);
    expect(result.indexes[0]).toMatchObject({ id: "idx-1", unique: true });
  });

  it("삭제 버튼을 클릭하면 applyCommand가 호출되고 removeIndex로 해당 인덱스가 제거된다", () => {
    const idx = makeIdx();
    const other = makeIdx({ id: "idx-2", name: "idx_other" });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idx, other]}
      />
    );

    fireEvent.click(screen.getByLabelText("idx_users_user_id 삭제"));

    expect(mockApplyCommand).toHaveBeenCalledTimes(1);
    const result = runUpdater(0, [idx, other]);
    expect(result.indexes).toEqual([other]);
  });

  it("entityIndexes가 여러 개면 각각에 대해 행이 렌더링된다", () => {
    const idxA = makeIdx({ id: "idx-1", name: "idx_a" });
    const idxB = makeIdx({ id: "idx-2", name: "idx_b" });
    render(
      <IndexSection
        entityId="ent-1"
        entityName="users"
        entityColumns={columns}
        entityIndexes={[idxA, idxB]}
      />
    );

    expect(screen.getByDisplayValue("idx_a")).toBeInTheDocument();
    expect(screen.getByDisplayValue("idx_b")).toBeInTheDocument();
    expect(screen.queryByText("인덱스 없음")).not.toBeInTheDocument();
  });
});

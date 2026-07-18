import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeProps } from "@xyflow/react";
import type * as XYFlowModule from "@xyflow/react";
import type { DiagramEntity, DiagramIndex } from "@erdify/domain";
import {
  addColumn,
  removeEntity,
  renameEntity,
  setEntitySchema,
  setSeedData,
  updateColumn,
  updateEntityComment,
} from "@erdify/domain";
import { EditableTableNode } from "./index";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/useEditorStore";
import type { EditableTableNodeType } from "@/features/editor/store/useEditorStore";
import { useColumnNameSuggestions } from "@/features/editor/hooks/useColumnNameSuggestions";

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof XYFlowModule>();
  return {
    ...actual,
    Handle: ({ type, position }: { type: string; position: unknown }) => (
      <div data-testid={`handle-${type}`} data-position={String(position)} />
    ),
  };
});

vi.mock("@/features/editor/store/useEditorStore");

vi.mock("@/features/editor/hooks/useColumnNameSuggestions", () => ({
  useColumnNameSuggestions: vi.fn(),
}));

vi.mock("@erdify/domain", () => ({
  addColumn: vi.fn((doc) => doc),
  removeEntity: vi.fn((doc) => doc),
  renameEntity: vi.fn((doc) => doc),
  setEntitySchema: vi.fn((doc) => doc),
  setSeedData: vi.fn((doc) => doc),
  updateColumn: vi.fn((doc) => doc),
  updateEntityComment: vi.fn((doc) => doc),
}));

vi.mock("./IMEInput", () => ({
  IMEInput: ({
    value,
    onChange,
    className,
    placeholder,
    "aria-label": ariaLabel,
  }: {
    value: string;
    onChange: (v: string) => void;
    className?: string;
    placeholder?: string;
    "aria-label"?: string;
  }) => (
    <input
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("./SchemaStrip", () => ({
  SchemaStrip: ({
    schema,
    onChange,
  }: {
    schema: string | null | undefined;
    onChange?: (s: string | null) => void;
  }) => (
    <div data-testid="mock-schema-strip" data-schema={schema ?? ""}>
      {onChange && (
        <button type="button" onClick={() => onChange("newschema")}>
          change-schema
        </button>
      )}
    </div>
  ),
}));

vi.mock("./SeedLens", () => ({
  SeedLens: ({
    entity,
    onCommit,
  }: {
    entity: DiagramEntity;
    onCommit: (rows: Record<string, string>[]) => void;
  }) => (
    <div data-testid="mock-seed-lens" data-entity-id={entity.id}>
      <button type="button" onClick={() => onCommit([{ col1: "v1" }])}>
        commit-seed
      </button>
    </div>
  ),
}));

vi.mock("./ColumnRow", () => ({
  ColumnRow: ({
    col,
    entityId,
    onSelectSuggestion,
  }: {
    col: { id: string; name: string };
    entityId: string;
    onSelectSuggestion: (
      col: { id: string; name: string },
      s: { name: string; type: string; nullable: boolean; pk: boolean }
    ) => void;
  }) => (
    <div data-testid={`mock-column-row-${col.id}`} data-entity-id={entityId}>
      {col.name}
      <button
        type="button"
        onClick={() =>
          onSelectSuggestion(col, { name: "suggested", type: "int", nullable: true, pk: false })
        }
      >
        select-suggestion-{col.id}
      </button>
    </div>
  ),
}));

vi.mock("./RoColumnRow", () => ({
  RoColumnRow: ({ col }: { col: { id: string; name: string } }) => (
    <div data-testid={`mock-ro-column-row-${col.id}`}>{col.name}</div>
  ),
}));

vi.mock("./IndexSection", () => ({
  IndexSection: ({
    entityId,
    entityName,
    entityColumns,
    entityIndexes,
  }: {
    entityId: string;
    entityName: string;
    entityColumns: unknown[];
    entityIndexes: unknown[];
  }) => (
    <div
      data-testid="mock-index-section"
      data-entity-id={entityId}
      data-entity-name={entityName}
      data-col-count={entityColumns.length}
      data-idx-count={entityIndexes.length}
    />
  ),
}));

vi.mock("./editable-table-node.css", () => ({
  tableNodeWrapper: "tableNodeWrapper",
  tableNodeWrapperReadOnly: "tableNodeWrapperReadOnly",
  tableNodeWrapperEdit: "tableNodeWrapperEdit",
  tableNodeGlow: "tableNodeGlow",
  collaboratorDot: "collaboratorDot",
  tableNodeHeader: "tableNodeHeader",
  tableNodeHeaderComment: "tableNodeHeaderComment",
  roColHeaderRow: "roColHeaderRow",
  roColHeaderCellFixed: "roColHeaderCellFixed",
  roColHeaderCellFk: "roColHeaderCellFk",
  roColHeaderCellNullable: "roColHeaderCellNullable",
  roColHeaderCellFluid: "roColHeaderCellFluid",
  roColHeaderCellWide: "roColHeaderCellWide",
  roColHeaderCellType: "roColHeaderCellType",
  roColList: "roColList",
  roEmptyColumns: "roEmptyColumns",
  indexSection: "indexSection",
  indexSectionLabel: "indexSectionLabel",
  indexSectionHeader: "indexSectionHeader",
  roIndexRow: "roIndexRow",
  roIndexBadgeVariants: { unique: "roIndexBadgeVariants-unique", normal: "roIndexBadgeVariants-normal" },
  roIndexName: "roIndexName",
  roIndexColNames: "roIndexColNames",
  headerEditRow: "headerEditRow",
  tableCommentInput: "tableCommentInput",
  tableNameInput: "tableNameInput",
  deleteEntityBtn: "deleteEntityBtn",
  colHeaderRow: "colHeaderRow",
  colHeaderCellFixed: "colHeaderCellFixed",
  colHeaderCellFluid: "colHeaderCellFluid",
  colHeaderCellType: "colHeaderCellType",
  colHeaderSpacer: "colHeaderSpacer",
  addColumnWrapper: "addColumnWrapper",
  addColumnBtn: "addColumnBtn",
}));

const makeEntity = (overrides: Partial<DiagramEntity> = {}): DiagramEntity => ({
  id: "entity-1",
  schema: null,
  name: "users",
  logicalName: null,
  comment: null,
  color: null,
  columns: [],
  seedData: [],
  ...overrides,
});

interface StoreOverrides {
  canEdit?: boolean;
  schemaColors?: Record<string, string>;
  allSchemas?: string[];
  indexesByEntityId?: Map<string, DiagramIndex[]>;
  flashingEntityId?: string | null;
  applyCommand?: ReturnType<typeof vi.fn>;
  setSelectedEntity?: ReturnType<typeof vi.fn>;
  setFlashingEntityId?: ReturnType<typeof vi.fn>;
}

const setupStore = (overrides: StoreOverrides = {}) => {
  const state = {
    canEdit: true,
    schemaColors: {},
    allSchemas: [],
    indexesByEntityId: new Map<string, DiagramIndex[]>(),
    flashingEntityId: null,
    applyCommand: vi.fn(),
    setSelectedEntity: vi.fn(),
    setFlashingEntityId: vi.fn(),
    ...overrides,
  } as unknown as EditorState;

  vi.mocked(useEditorStore).mockImplementation(
    (selector: (s: EditorState) => unknown) => selector(state)
  );

  return state as unknown as Required<StoreOverrides>;
};

const renderNode = (
  entity: DiagramEntity,
  opts: { selected?: boolean; collaboratorColor?: string } = {}
) => {
  const data = { entity, collaboratorColor: opts.collaboratorColor } as EditableTableNodeType["data"];
  return render(
    <EditableTableNode
      {...({ id: "node-1", type: "editableTable", data, selected: opts.selected ?? false } as unknown as NodeProps<EditableTableNodeType>)}
    />
  );
};

describe("EditableTableNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useColumnNameSuggestions).mockReturnValue({
      suggestions: [],
      activeSuggestionColId: null,
      handleColumnNameInput: vi.fn(),
      clearSuggestions: vi.fn(),
    });
  });

  describe("읽기 전용 모드 (canEdit=false)", () => {
    it("컬럼이 없으면 '컬럼 없음' 문구를 표시한다", () => {
      setupStore({ canEdit: false });
      renderNode(makeEntity({ columns: [] }));

      expect(screen.getByText("컬럼 없음")).toBeInTheDocument();
    });

    it("컬럼이 있으면 각 컬럼마다 RoColumnRow를 렌더링한다", () => {
      setupStore({ canEdit: false });
      const entity = makeEntity({
        columns: [
          { id: "c1", name: "id", type: "int", nullable: false, primaryKey: true, unique: true, defaultValue: null, comment: null, ordinal: 0 },
          { id: "c2", name: "email", type: "varchar(255)", nullable: true, primaryKey: false, unique: false, defaultValue: null, comment: null, ordinal: 1 },
        ],
      });
      renderNode(entity);

      expect(screen.getByTestId("mock-ro-column-row-c1")).toBeInTheDocument();
      expect(screen.getByTestId("mock-ro-column-row-c2")).toBeInTheDocument();
      expect(screen.queryByText("컬럼 없음")).not.toBeInTheDocument();
    });

    it("entity.schema가 있으면 SchemaStrip을 렌더링한다", () => {
      setupStore({ canEdit: false });
      renderNode(makeEntity({ schema: "public" }));

      expect(screen.getByTestId("mock-schema-strip")).toHaveAttribute("data-schema", "public");
    });

    it("entity.schema가 없으면 SchemaStrip을 렌더링하지 않는다", () => {
      setupStore({ canEdit: false });
      renderNode(makeEntity({ schema: null }));

      expect(screen.queryByTestId("mock-schema-strip")).not.toBeInTheDocument();
    });

    it("entity.comment가 있으면 헤더 아래에 표시한다", () => {
      setupStore({ canEdit: false });
      renderNode(makeEntity({ comment: "사용자 테이블" }));

      expect(screen.getByText("사용자 테이블")).toBeInTheDocument();
    });

    it("entity.comment가 없으면 표시하지 않는다", () => {
      setupStore({ canEdit: false });
      renderNode(makeEntity({ comment: null, name: "users" }));

      expect(screen.getByText("users")).toBeInTheDocument();
      expect(screen.queryByText(/테이블/)).not.toBeInTheDocument();
    });

    it("collaboratorColor가 있으면 dot을 렌더링하고 boxShadow에 반영한다", () => {
      setupStore({ canEdit: false });
      const { container } = renderNode(makeEntity(), { collaboratorColor: "#ff0000" });

      const dot = container.querySelector(".collaboratorDot") as HTMLElement;
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveStyle({ background: "#ff0000" });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ boxShadow: "0 0 0 3px #ff000040" });
    });

    it("collaboratorColor가 없고 selected이면 selected용 boxShadow를 사용한다", () => {
      setupStore({ canEdit: false });
      const { container } = renderNode(makeEntity(), { selected: true });

      expect(container.querySelector(".collaboratorDot")).not.toBeInTheDocument();
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ boxShadow: "0 4px 20px rgba(0, 100, 224, 0.18)" });
    });

    it("collaboratorColor도 없고 selected도 아니면 기본 boxShadow를 사용한다", () => {
      setupStore({ canEdit: false });
      const { container } = renderNode(makeEntity(), { selected: false });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ boxShadow: "0 1px 4px rgba(0,0,0,0.1)" });
    });

    it("헤더 배경은 collaboratorColor > entity.color > schemaColor > 기본색 순으로 결정된다", () => {
      setupStore({ canEdit: false, allSchemas: ["public"], schemaColors: { public: "#123456" } });
      const { container } = renderNode(
        makeEntity({ schema: "public", color: "#00ff00" }),
        { collaboratorColor: "#ff0000" }
      );

      const header = container.querySelector(".tableNodeHeader") as HTMLElement;
      expect(header).toHaveStyle({ background: "#ff0000" });
    });

    it("entity.schema가 있으면 헤더 borderRadius가 0이다", () => {
      setupStore({ canEdit: false });
      const { container } = renderNode(makeEntity({ schema: "public" }));

      const header = container.querySelector(".tableNodeHeader") as HTMLElement;
      expect(header).toHaveStyle({ borderRadius: "0" });
    });

    it("entity.schema가 없으면 헤더 borderRadius가 라운드값이다", () => {
      setupStore({ canEdit: false });
      const { container } = renderNode(makeEntity({ schema: null }));

      const header = container.querySelector(".tableNodeHeader") as HTMLElement;
      expect(header).toHaveStyle({ borderRadius: "4px 4px 0 0" });
    });

    it("인덱스가 없으면 인덱스 섹션이 렌더링되지 않는다", () => {
      setupStore({ canEdit: false, indexesByEntityId: new Map() });
      renderNode(makeEntity());

      expect(screen.queryByText("Indexes")).not.toBeInTheDocument();
    });

    it("unique 인덱스는 UQ 배지를, 일반 인덱스는 IDX 배지를 표시하고 컬럼명을 조인한다", () => {
      const entity = makeEntity({
        columns: [
          { id: "c1", name: "email", type: "varchar(255)", nullable: false, primaryKey: false, unique: true, defaultValue: null, comment: null, ordinal: 0 },
        ],
      });
      const indexes: DiagramIndex[] = [
        { id: "idx1", entityId: entity.id, name: "idx_email", columnIds: ["c1"], unique: true },
        { id: "idx2", entityId: entity.id, name: "idx_missing", columnIds: ["ghost-id"], unique: false },
      ];
      setupStore({
        canEdit: false,
        indexesByEntityId: new Map([[entity.id, indexes]]),
      });
      renderNode(entity);

      expect(screen.getByText("Indexes")).toBeInTheDocument();
      expect(screen.getByText("UQ", { selector: ".roIndexBadgeVariants-unique" })).toBeInTheDocument();
      expect(screen.getByText("IDX", { selector: ".roIndexBadgeVariants-normal" })).toBeInTheDocument();
      expect(screen.getByText("idx_email")).toBeInTheDocument();
      expect(screen.getByText("(email)")).toBeInTheDocument();
      // 컬럼을 찾지 못하면 id로 fallback한다
      expect(screen.getByText("(ghost-id)")).toBeInTheDocument();
    });

    it("isFlashing이면 glow 클래스가 붙고 onAnimationEnd 시 setFlashingEntityId(null)을 호출한다", () => {
      const entity = makeEntity();
      const state = setupStore({ canEdit: false, flashingEntityId: entity.id });
      const { container } = renderNode(entity);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("tableNodeGlow");

      fireEvent.animationEnd(wrapper);
      expect(state.setFlashingEntityId).toHaveBeenCalledWith(null);
    });

    it("isFlashing이 아니면 glow 클래스가 붙지 않는다", () => {
      const entity = makeEntity();
      setupStore({ canEdit: false, flashingEntityId: "other-entity" });
      const { container } = renderNode(entity);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).not.toContain("tableNodeGlow");
    });

    it("target/source Handle을 렌더링한다", () => {
      setupStore({ canEdit: false });
      renderNode(makeEntity());

      expect(screen.getByTestId("handle-target")).toBeInTheDocument();
      expect(screen.getByTestId("handle-source")).toBeInTheDocument();
    });
  });

  describe("편집 모드 (canEdit=true)", () => {
    it("테이블명/논리명 입력과 삭제 버튼, 컬럼 헤더를 렌더링한다", () => {
      setupStore({ canEdit: true });
      renderNode(makeEntity({ name: "users" }));

      expect(screen.getByLabelText("테이블명")).toHaveValue("users");
      expect(screen.getByLabelText("테이블 논리명")).toBeInTheDocument();
      expect(screen.getByLabelText("users 테이블 삭제")).toBeInTheDocument();
      expect(screen.getByText("PK")).toBeInTheDocument();
      expect(screen.getByText("논리명")).toBeInTheDocument();
    });

    it("테이블명을 변경하면 applyCommand를 통해 renameEntity가 호출된다", () => {
      const entity = makeEntity({ name: "users" });
      const state = setupStore({ canEdit: true });
      state.applyCommand.mockImplementation((updater: (doc: unknown) => unknown) => updater({}));
      renderNode(entity);

      fireEvent.change(screen.getByLabelText("테이블명"), { target: { value: "accounts" } });

      expect(state.applyCommand).toHaveBeenCalled();
      expect(renameEntity).toHaveBeenCalledWith({}, entity.id, "accounts");
    });

    it("논리명을 입력하면 updateEntityComment가 입력값으로 호출된다", () => {
      const entity = makeEntity();
      const state = setupStore({ canEdit: true });
      state.applyCommand.mockImplementation((updater: (doc: unknown) => unknown) => updater({}));
      renderNode(entity);

      fireEvent.change(screen.getByLabelText("테이블 논리명"), { target: { value: "사용자" } });
      expect(updateEntityComment).toHaveBeenCalledWith({}, entity.id, "사용자");
    });

    it("논리명을 빈 값으로 입력하면 updateEntityComment가 null로 호출된다", () => {
      const entity = makeEntity({ comment: "기존 설명" });
      const state = setupStore({ canEdit: true });
      state.applyCommand.mockImplementation((updater: (doc: unknown) => unknown) => updater({}));
      renderNode(entity);

      fireEvent.change(screen.getByLabelText("테이블 논리명"), { target: { value: "" } });
      expect(updateEntityComment).toHaveBeenCalledWith({}, entity.id, null);
    });

    it("삭제 버튼을 클릭하면 removeEntity와 setSelectedEntity(null)이 호출된다", () => {
      const entity = makeEntity({ name: "users" });
      const state = setupStore({ canEdit: true });
      state.applyCommand.mockImplementation((updater: (doc: unknown) => unknown) => updater({}));
      renderNode(entity);

      fireEvent.click(screen.getByLabelText("users 테이블 삭제"));

      expect(removeEntity).toHaveBeenCalledWith({}, entity.id);
      expect(state.setSelectedEntity).toHaveBeenCalledWith(null);
    });

    it("SchemaStrip의 onChange 호출 시 setEntitySchema가 호출된다", () => {
      const entity = makeEntity({ schema: "public" });
      const state = setupStore({ canEdit: true });
      state.applyCommand.mockImplementation((updater: (doc: unknown) => unknown) => updater({}));
      renderNode(entity);

      fireEvent.click(screen.getByText("change-schema"));

      expect(setEntitySchema).toHaveBeenCalledWith({}, entity.id, "newschema");
    });

    it("헤더 배경은 collaboratorColor 없이 entity.color > schemaColor > 기본색 순으로 결정된다", () => {
      setupStore({ canEdit: true, allSchemas: ["public"], schemaColors: { public: "#123456" } });
      const { container } = renderNode(makeEntity({ schema: "public", color: null }));

      const header = container.querySelector(".headerEditRow") as HTMLElement;
      expect(header).toHaveStyle({ background: "#123456" });
    });

    it("컬럼마다 ColumnRow를 렌더링한다", () => {
      const entity = makeEntity({
        columns: [
          { id: "c1", name: "id", type: "int", nullable: false, primaryKey: true, unique: true, defaultValue: null, comment: null, ordinal: 0 },
        ],
      });
      setupStore({ canEdit: true });
      renderNode(entity);

      expect(screen.getByTestId("mock-column-row-c1")).toHaveAttribute("data-entity-id", entity.id);
    });

    it("컬럼의 suggestion 선택 시 updateColumn이 호출되고 clearSuggestions가 호출된다", () => {
      const clearSuggestions = vi.fn();
      vi.mocked(useColumnNameSuggestions).mockReturnValue({
        suggestions: [],
        activeSuggestionColId: null,
        handleColumnNameInput: vi.fn(),
        clearSuggestions,
      });
      const entity = makeEntity({
        columns: [
          { id: "c1", name: "id", type: "int", nullable: false, primaryKey: true, unique: true, defaultValue: null, comment: null, ordinal: 0 },
        ],
      });
      const state = setupStore({ canEdit: true });
      state.applyCommand.mockImplementation((updater: (doc: unknown) => unknown) => updater({}));
      renderNode(entity);

      fireEvent.click(screen.getByText("select-suggestion-c1"));

      expect(updateColumn).toHaveBeenCalledWith(
        {},
        entity.id,
        "c1",
        { name: "suggested", type: "int", nullable: true, primaryKey: false }
      );
      expect(clearSuggestions).toHaveBeenCalled();
    });

    it("컬럼 추가 버튼을 클릭하면 addColumn이 호출된다", () => {
      const entity = makeEntity({ name: "users", columns: [] });
      const state = setupStore({ canEdit: true });
      state.applyCommand.mockImplementation((updater: (doc: unknown) => unknown) => updater({}));
      renderNode(entity);

      fireEvent.click(screen.getByLabelText("users 테이블에 컬럼 추가"));

      expect(addColumn).toHaveBeenCalledWith({}, entity.id, expect.objectContaining({ ordinal: 0 }));
    });

    it("IndexSection에 entity 정보를 전달한다", () => {
      const entity = makeEntity({
        columns: [
          { id: "c1", name: "id", type: "int", nullable: false, primaryKey: true, unique: true, defaultValue: null, comment: null, ordinal: 0 },
        ],
      });
      const indexes: DiagramIndex[] = [
        { id: "idx1", entityId: entity.id, name: "idx1", columnIds: ["c1"], unique: false },
      ];
      setupStore({ canEdit: true, indexesByEntityId: new Map([[entity.id, indexes]]) });
      renderNode(entity);

      const section = screen.getByTestId("mock-index-section");
      expect(section).toHaveAttribute("data-entity-id", entity.id);
      expect(section).toHaveAttribute("data-entity-name", entity.name);
      expect(section).toHaveAttribute("data-col-count", "1");
      expect(section).toHaveAttribute("data-idx-count", "1");
    });

    it("SeedLens의 onCommit 호출 시 setSeedData가 호출된다", () => {
      const entity = makeEntity();
      const state = setupStore({ canEdit: true });
      state.applyCommand.mockImplementation((updater: (doc: unknown) => unknown) => updater({}));
      renderNode(entity);

      fireEvent.click(screen.getByText("commit-seed"));

      expect(setSeedData).toHaveBeenCalledWith({}, entity.id, [{ col1: "v1" }]);
    });

    it("isFlashing이면 glow 클래스가 붙고 onAnimationEnd 시 setFlashingEntityId(null)을 호출한다", () => {
      const entity = makeEntity();
      const state = setupStore({ canEdit: true, flashingEntityId: entity.id });
      const { container } = renderNode(entity);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("tableNodeGlow");

      fireEvent.animationEnd(wrapper);
      expect(state.setFlashingEntityId).toHaveBeenCalledWith(null);
    });
  });
});

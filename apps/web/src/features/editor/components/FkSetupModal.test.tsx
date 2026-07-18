import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FkSetupModal } from "./FkSetupModal";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/useEditorStore";
import type { PendingConnection } from "@/features/editor/store/useEditorStore";
import { addColumn, addRelationship } from "@erdify/domain";
import type { DiagramDocument } from "@erdify/domain";

vi.mock("@/features/editor/store/useEditorStore");
vi.mock("@erdify/domain", () => ({
  addColumn: vi.fn((doc) => doc),
  addRelationship: vi.fn((doc) => doc),
}));
vi.mock("@/shared/utils/uuid", () => ({ randomUUID: vi.fn(() => "test-uuid") }));
vi.mock("@/shared/components/Modal", () => ({
  Modal: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
  }) =>
    open ? (
      <div role="dialog">
        {title && <div>{title}</div>}
        {children}
      </div>
    ) : null,
}));
vi.mock("./fk-setup-modal.css", () => ({
  body: "",
  description: "",
  pkRow: "",
  pkLabel: "",
  modeRow: "",
  radioLabel: "",
  textInput: "",
  colSelect: "",
  footer: "",
  cancelBtn: "",
  confirmBtn: "",
}));

const mockApplyCommand = vi.fn();
const mockSetPendingConnection = vi.fn();

const sampleDocument = {
  entities: [
    {
      id: "src-entity",
      name: "Orders",
      columns: [
        {
          id: "existing-col-1",
          name: "user_id",
          type: "int",
          nullable: true,
          primaryKey: false,
          unique: false,
          defaultValue: null,
          comment: null,
          ordinal: 0,
        },
      ],
    },
    {
      id: "tgt-entity",
      name: "Users",
      columns: [
        {
          id: "pk-col-1",
          name: "id",
          type: "int",
          nullable: false,
          primaryKey: true,
          unique: true,
          defaultValue: null,
          comment: null,
          ordinal: 0,
        },
      ],
    },
  ],
  relationships: [],
};

const samplePending: PendingConnection = {
  sourceEntityId: "src-entity",
  targetEntityId: "tgt-entity",
  autoMatchedCols: [],
  unmatchedPks: [
    {
      pkColId: "pk-col-1",
      pkColName: "id",
      pkColType: "int",
      suggestedName: "users_id",
    },
  ],
};

const setupStoreMock = (
  pendingConnection: PendingConnection | null,
  document: typeof sampleDocument | null = sampleDocument
) => {
  // zustand 훅의 오버로드 시그니처를 만족시키기 위해 구현 함수를 훅 타입으로 캐스팅한다
  vi.mocked(useEditorStore).mockImplementation(((selector: (s: EditorState) => unknown) =>
    selector({
      pendingConnection,
      setPendingConnection: mockSetPendingConnection,
      document,
      applyCommand: mockApplyCommand,
    } as unknown as EditorState)) as unknown as typeof useEditorStore);
};

describe("FkSetupModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStoreMock(null);
  });

  it("pendingConnection이 null이면 dialog가 렌더링되지 않는다", () => {
    setupStoreMock(null);
    render(<FkSetupModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pendingConnection이 있으면 dialog와 제목이 렌더링된다", () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("FK 컬럼 설정")).toBeInTheDocument();
  });

  it("소스/타겟 엔티티 이름이 설명에 표시된다", () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    expect(screen.getByText(/Orders/)).toBeInTheDocument();
    expect(screen.getByText(/Users/)).toBeInTheDocument();
  });

  it("unmatched PK에 대한 PK 라벨이 표시된다", () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    expect(screen.getByText(/id.*int/i)).toBeInTheDocument();
  });

  it("새 컬럼 이름 입력이 suggestedName으로 초기화된다", () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    const nameInput = screen.getByDisplayValue("users_id");
    expect(nameInput).toBeInTheDocument();
  });

  it("새 컬럼 이름 입력 변경이 동작한다", () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    const nameInput = screen.getByDisplayValue("users_id");
    fireEvent.change(nameInput, { target: { value: "custom_fk" } });
    expect(screen.getByDisplayValue("custom_fk")).toBeInTheDocument();
  });

  it('"기존 컬럼" 라디오 버튼 클릭 시 컬럼 선택 드롭다운이 나타난다', () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    const existingRadio = screen.getByLabelText("기존 컬럼");
    fireEvent.click(existingRadio);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText(/user_id.*int/i)).toBeInTheDocument();
  });

  it('"기존 컬럼" 선택 후 다시 "새 컬럼" 라디오 클릭 시 텍스트 입력이 복원된다', () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    const existingRadio = screen.getByLabelText("기존 컬럼");
    fireEvent.click(existingRadio);
    const newRadio = screen.getByLabelText("새 컬럼");
    fireEvent.click(newRadio);
    expect(screen.getByDisplayValue("users_id")).toBeInTheDocument();
  });

  it('"취소" 버튼 클릭 시 setPendingConnection(null)이 호출된다', () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    fireEvent.click(screen.getByText("취소"));
    expect(mockSetPendingConnection).toHaveBeenCalledWith(null);
  });

  it('"관계 생성" 버튼 클릭 시 applyCommand와 setPendingConnection(null)이 호출된다', () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    fireEvent.click(screen.getByText("관계 생성"));
    expect(mockApplyCommand).toHaveBeenCalled();
    expect(mockSetPendingConnection).toHaveBeenCalledWith(null);
  });

  it("소스 엔티티에 컬럼이 없으면 기존 컬럼 라디오가 표시되지 않는다", () => {
    const [src, tgt] = sampleDocument.entities as [typeof sampleDocument.entities[0], typeof sampleDocument.entities[0]];
    const documentWithNoColumns = {
      ...sampleDocument,
      entities: [{ ...src, columns: [] }, tgt],
    };
    setupStoreMock(samplePending, documentWithNoColumns);
    render(<FkSetupModal />);
    expect(screen.queryByLabelText("기존 컬럼")).not.toBeInTheDocument();
  });

  it("document가 null이면 Inner가 렌더링되지 않는다", () => {
    setupStoreMock(samplePending, null);
    render(<FkSetupModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("취소")).not.toBeInTheDocument();
  });

  it("취소/관계 생성 버튼은 type=button 속성을 가진다", () => {
    setupStoreMock(samplePending);
    render(<FkSetupModal />);
    expect(screen.getByText("취소")).toHaveAttribute("type", "button");
    expect(screen.getByText("관계 생성")).toHaveAttribute("type", "button");
  });

  it('새 컬럼 모드로 "관계 생성" 클릭 시 addColumn과 addRelationship이 올바른 인자로 호출된다', () => {
    setupStoreMock(samplePending);
    mockApplyCommand.mockImplementation((updater: (doc: DiagramDocument) => DiagramDocument) =>
      updater(sampleDocument as unknown as DiagramDocument)
    );
    render(<FkSetupModal />);

    fireEvent.click(screen.getByText("관계 생성"));

    expect(addColumn).toHaveBeenCalledWith(
      sampleDocument,
      "src-entity",
      expect.objectContaining({
        id: "test-uuid",
        name: "users_id",
        type: "int",
        nullable: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
        comment: null,
        ordinal: 1,
      })
    );
    expect(addRelationship).toHaveBeenCalledWith(
      sampleDocument,
      expect.objectContaining({
        id: "test-uuid",
        name: "fk_orders_users",
        sourceEntityId: "src-entity",
        sourceColumnIds: ["test-uuid"],
        targetEntityId: "tgt-entity",
        targetColumnIds: ["pk-col-1"],
        cardinality: "many-to-one",
        onDelete: "no-action",
        onUpdate: "no-action",
        identifying: false,
      })
    );
  });

  it('새 컬럼 이름을 공백으로 지운 뒤 "관계 생성" 클릭 시 suggestedName으로 대체된다', () => {
    setupStoreMock(samplePending);
    mockApplyCommand.mockImplementation((updater: (doc: DiagramDocument) => DiagramDocument) =>
      updater(sampleDocument as unknown as DiagramDocument)
    );
    render(<FkSetupModal />);

    const nameInput = screen.getByDisplayValue("users_id");
    fireEvent.change(nameInput, { target: { value: "   " } });
    fireEvent.click(screen.getByText("관계 생성"));

    expect(addColumn).toHaveBeenCalledWith(
      sampleDocument,
      "src-entity",
      expect.objectContaining({ name: "users_id" })
    );
  });

  it('"기존 컬럼" 선택 후 "관계 생성" 클릭 시 addColumn은 호출되지 않고 선택한 컬럼 id가 관계에 사용된다', () => {
    setupStoreMock(samplePending);
    mockApplyCommand.mockImplementation((updater: (doc: DiagramDocument) => DiagramDocument) =>
      updater(sampleDocument as unknown as DiagramDocument)
    );
    render(<FkSetupModal />);

    fireEvent.click(screen.getByLabelText("기존 컬럼"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "existing-col-1" } });
    fireEvent.click(screen.getByText("관계 생성"));

    expect(addColumn).not.toHaveBeenCalled();
    expect(addRelationship).toHaveBeenCalledWith(
      sampleDocument,
      expect.objectContaining({
        sourceColumnIds: ["existing-col-1"],
        targetColumnIds: ["pk-col-1"],
      })
    );
  });
});

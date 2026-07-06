import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ObjectEditModal } from "./ObjectEditModal";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/editor-store.types";
import type { DiagramDocument, DiagramObject } from "@erdify/domain";

vi.mock("@/features/editor/store/useEditorStore");

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

vi.mock("./object-edit-modal.css", () => ({
  kindTabsRow: "",
  kindTabVariants: { active: "kind-tab-active", inactive: "kind-tab-inactive" },
  fieldLabel: "",
  nameField: "",
  warningText: "warningText",
  actionsRow: "",
  actionsRowRight: "",
  btnBase: "",
  cancelBtn: "",
  deleteBtn: "",
}));

let capturedEditorProps: {
  value: string;
  onChange?: (v: string) => void;
  onFileDrop?: (file: File) => void;
} | null = null;

vi.mock("./DarkCodeEditor", () => ({
  DarkCodeEditor: (props: {
    value: string;
    onChange?: (v: string) => void;
    onFileDrop?: (file: File) => void;
  }) => {
    capturedEditorProps = props;
    return (
      <textarea
        data-testid="sql-editor"
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    );
  },
}));

const mockApplyCommand = vi.fn();

const setupStore = (canEdit = true) => {
  vi.mocked(useEditorStore).mockImplementation((selector: (s: EditorState) => unknown) =>
    selector({ applyCommand: mockApplyCommand, canEdit } as unknown as EditorState)
  );
};

// @erdify/domain은 mock하지 않는다: ObjectEditModal이 저장/삭제 시 넘기는
// updater 함수는 실제 addObject/updateObject/removeObject(도메인 dist)를 그대로
// 호출하므로, applyCommand에 전달된 updater를 최소 doc에 적용해 도메인 연동까지 검증한다.
const sampleDoc = (objects: DiagramObject[] = []): DiagramDocument =>
  ({ objects } as unknown as DiagramDocument);

const runUpdater = (objects: DiagramObject[] = []) => {
  const updater = mockApplyCommand.mock.calls[0]![0] as (doc: DiagramDocument) => DiagramDocument;
  return updater(sampleDoc(objects));
};

describe("ObjectEditModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedEditorProps = null;
    setupStore();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("add 모드: 이름/SQL 입력 후 저장 시 applyCommand가 addObject 결과(기존 id 재사용)를 반영한다", () => {
    const object: DiagramObject = { id: "obj-1", kind: "procedure", name: "", sql: "" };
    render(<ObjectEditModal object={object} mode="add" onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("객체 이름"), { target: { value: "sp_test" } });
    fireEvent.change(screen.getByTestId("sql-editor"), {
      target: { value: "CREATE PROCEDURE sp_test() BEGIN END;" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(mockApplyCommand).toHaveBeenCalledTimes(1);
    const result = runUpdater([]);
    expect(result.objects).toEqual([
      { id: "obj-1", kind: "procedure", name: "sp_test", sql: "CREATE PROCEDURE sp_test() BEGIN END;" },
    ]);
  });

  it("빈 이름(공백만 입력 포함)이면 저장 버튼이 비활성화되고 applyCommand가 호출되지 않는다", () => {
    const object: DiagramObject = { id: "obj-1", kind: "procedure", name: "", sql: "" };
    render(<ObjectEditModal object={object} mode="add" onClose={vi.fn()} />);

    const saveBtn = screen.getByRole("button", { name: "저장" });
    expect(saveBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("객체 이름"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(mockApplyCommand).not.toHaveBeenCalled();
  });

  it("edit 모드: 기존 값이 프리필되고, 이름 변경 후 저장 시 updateObject가 반영된다", () => {
    const object: DiagramObject = { id: "obj-2", kind: "trigger", name: "trg_old", sql: "OLD SQL" };
    render(<ObjectEditModal object={object} mode="edit" onClose={vi.fn()} />);

    expect(screen.getByDisplayValue("trg_old")).toBeInTheDocument();
    expect(screen.getByTestId("sql-editor")).toHaveValue("OLD SQL");
    expect(screen.getByRole("button", { name: "트리거" })).toHaveClass("kind-tab-active");

    fireEvent.change(screen.getByPlaceholderText("객체 이름"), { target: { value: "trg_new" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(mockApplyCommand).toHaveBeenCalledTimes(1);
    const result = runUpdater([object]);
    expect(result.objects).toEqual([{ id: "obj-2", kind: "trigger", name: "trg_new", sql: "OLD SQL" }]);
  });

  it("edit 모드: 삭제 버튼 클릭 시 confirm 후 removeObject가 반영되고 onClose가 호출된다", () => {
    const object: DiagramObject = { id: "obj-3", kind: "function", name: "fn_x", sql: "SELECT 1;" };
    const onClose = vi.fn();
    render(<ObjectEditModal object={object} mode="edit" onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockApplyCommand).toHaveBeenCalledTimes(1);
    const result = runUpdater([object]);
    expect(result.objects).toEqual([]);
    expect(onClose).toHaveBeenCalled();
  });

  it("edit 모드: confirm을 취소하면 removeObject가 반영되지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const object: DiagramObject = { id: "obj-4", kind: "function", name: "fn_y", sql: "" };
    render(<ObjectEditModal object={object} mode="edit" onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(mockApplyCommand).not.toHaveBeenCalled();
  });

  it("add 모드에서는 삭제 버튼이 렌더되지 않는다", () => {
    const object: DiagramObject = { id: "obj-5", kind: "view", name: "", sql: "" };
    render(<ObjectEditModal object={object} mode="add" onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  });

  it("읽기 전용(canEdit=false)이면 저장/삭제 버튼이 비활성화되고 applyCommand가 호출되지 않는다", () => {
    setupStore(false);
    const object: DiagramObject = { id: "obj-ro", kind: "procedure", name: "sp_ro", sql: "SELECT 1;" };
    render(<ObjectEditModal object={object} mode="edit" onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(mockApplyCommand).not.toHaveBeenCalled();
  });

  it(".sql 파일을 드롭하면 file.text() 결과가 SQL 편집기에 반영된다", async () => {
    const object: DiagramObject = { id: "obj-6", kind: "procedure", name: "sp_z", sql: "" };
    render(<ObjectEditModal object={object} mode="edit" onClose={vi.fn()} />);

    const fakeFile = { text: () => Promise.resolve("-- from file\nSELECT 1;") } as unknown as File;

    await act(async () => {
      await capturedEditorProps?.onFileDrop?.(fakeFile);
    });

    await waitFor(() => {
      expect(screen.getByTestId("sql-editor")).toHaveValue("-- from file\nSELECT 1;");
    });
  });
});

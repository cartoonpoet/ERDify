import { render, screen, fireEvent } from "@testing-library/react";
import { IndexColumnSelect } from "./IndexColumnSelect";
import type { DiagramColumn } from "@erdify/domain";

vi.mock("./editable-table-node.css", () => ({
  indexColWrapper: "",
  indexColsBtn: "",
  indexColsBackdrop: "",
  indexColsDropdown: "",
  indexColOption: "",
  indexColCheckbox: "",
  indexColEmpty: "",
}));

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

describe("IndexColumnSelect", () => {
  it("기본 상태에서는 닫혀 있고 '컬럼 선택' 라벨을 보여준다", () => {
    render(<IndexColumnSelect entityColumns={columns} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("컬럼 선택");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("버튼 클릭 시 열리고 entityColumns 각각에 대한 체크박스가 selectedIds에 맞는 checked 상태로 렌더링된다", () => {
    render(
      <IndexColumnSelect entityColumns={columns} selectedIds={["col-1"]} onChange={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button"));

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[0]!.closest("label")).toHaveTextContent("user_id");
    expect(checkboxes[1]!.closest("label")).toHaveTextContent("created_at");
  });

  it("체크되지 않은 컬럼을 체크하면 onChange가 id가 추가된 배열로 호출된다", () => {
    const onChange = vi.fn();
    render(
      <IndexColumnSelect entityColumns={columns} selectedIds={["col-1"]} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole("button"));
    const [, secondCheckbox] = screen.getAllByRole("checkbox");
    fireEvent.click(secondCheckbox!);

    expect(onChange).toHaveBeenCalledWith(["col-1", "col-2"]);
  });

  it("체크된 컬럼을 체크 해제하면 onChange가 id가 제거된 배열로 호출된다", () => {
    const onChange = vi.fn();
    render(
      <IndexColumnSelect
        entityColumns={columns}
        selectedIds={["col-1", "col-2"]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    const [firstCheckbox] = screen.getAllByRole("checkbox");
    fireEvent.click(firstCheckbox!);

    expect(onChange).toHaveBeenCalledWith(["col-2"]);
  });

  it("backdrop을 클릭하면 드롭다운이 닫힌다", () => {
    const { container } = render(
      <IndexColumnSelect entityColumns={columns} selectedIds={[]} onChange={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);

    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

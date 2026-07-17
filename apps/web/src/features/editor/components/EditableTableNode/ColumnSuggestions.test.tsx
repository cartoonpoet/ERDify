import { render, screen, fireEvent, within } from "@testing-library/react";
import { ColumnSuggestions } from "./ColumnSuggestions";
import type { ColumnSuggestion } from "@erdify/contracts";

vi.mock("./editable-table-node.css", () => ({
  suggestionsList: "",
  suggestionItem: "",
  suggestionItemBtn: "",
  suggestionItemType: "",
  suggestionItemPk: "",
}));

const suggestions: ColumnSuggestion[] = [
  { name: "id", type: "bigint", nullable: false, pk: true },
  { name: "email", type: "varchar", nullable: true, pk: false },
];

describe("ColumnSuggestions", () => {
  it("suggestions 개수만큼 버튼을 렌더링하고 각각 name/type/PK 배지를 보여준다", () => {
    render(<ColumnSuggestions suggestions={suggestions} onSelect={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    const [firstBtn, secondBtn] = buttons;

    expect(within(firstBtn!).getByText("id")).toBeInTheDocument();
    expect(within(firstBtn!).getByText("bigint")).toBeInTheDocument();
    expect(within(firstBtn!).getByText("PK")).toBeInTheDocument();

    expect(within(secondBtn!).getByText("email")).toBeInTheDocument();
    expect(within(secondBtn!).getByText("varchar")).toBeInTheDocument();
    expect(within(secondBtn!).queryByText("PK")).not.toBeInTheDocument();
  });

  it("suggestion 버튼을 클릭하면 onSelect가 해당 suggestion으로 호출된다", () => {
    const onSelect = vi.fn();
    render(<ColumnSuggestions suggestions={suggestions} onSelect={onSelect} />);

    const [, secondBtn] = screen.getAllByRole("button");
    fireEvent.click(secondBtn!);

    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("mouseDown만으로는 onSelect가 호출되지 않는다 (blur 방지 전용, 선택은 click에서 처리)", () => {
    const onSelect = vi.fn();
    render(<ColumnSuggestions suggestions={suggestions} onSelect={onSelect} />);

    const [, secondBtn] = screen.getAllByRole("button");
    fireEvent.mouseDown(secondBtn!);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("키보드로 포커스한 뒤 Enter를 누르면(click 이벤트) onSelect가 호출된다", () => {
    const onSelect = vi.fn();
    render(<ColumnSuggestions suggestions={suggestions} onSelect={onSelect} />);

    const [firstBtn] = screen.getAllByRole("button");
    firstBtn!.focus();
    fireEvent.click(firstBtn!);

    expect(onSelect).toHaveBeenCalledWith(suggestions[0]);
  });
});

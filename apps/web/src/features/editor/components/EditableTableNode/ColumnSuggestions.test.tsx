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

  it("suggestion 버튼을 mouseDown하면 onSelect가 해당 suggestion으로 호출된다", () => {
    const onSelect = vi.fn();
    render(<ColumnSuggestions suggestions={suggestions} onSelect={onSelect} />);

    const [, secondBtn] = screen.getAllByRole("button");
    fireEvent.mouseDown(secondBtn!);

    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

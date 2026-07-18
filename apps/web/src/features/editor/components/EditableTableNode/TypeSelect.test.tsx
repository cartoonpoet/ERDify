import { render, screen, fireEvent } from "@testing-library/react";
import { TypeSelect } from "./TypeSelect";

vi.mock("./editable-table-node.css", () => ({
  typeSelectWrapper: "",
  typeInput: "",
  typeDropdown: "",
  typeOption: "",
  // 활성 클래스 적용 여부를 검증해야 하므로, 이 클래스만 식별 가능한 값으로 목킹한다.
  typeOptionActive: "typeOptionActive",
}));

describe("TypeSelect", () => {
  it("value를 입력값으로 렌더링하고 기본적으로 드롭다운은 닫혀 있다", () => {
    render(<TypeSelect value="int" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("타입...")).toHaveValue("int");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("label이 주어지면 aria-label로 사용하고, 없으면 기본값을 사용한다", () => {
    const { rerender } = render(<TypeSelect value="int" onChange={vi.fn()} />);
    expect(screen.getByLabelText("컬럼 타입")).toBeInTheDocument();

    rerender(<TypeSelect value="int" onChange={vi.fn()} label="커스텀 라벨" />);
    expect(screen.getByLabelText("커스텀 라벨")).toBeInTheDocument();
  });

  it("포커스하면 드롭다운이 열리고 value와 일치하는 타입 목록이 보인다", () => {
    render(<TypeSelect value="int" onChange={vi.fn()} />);
    fireEvent.focus(screen.getByPlaceholderText("타입..."));

    expect(screen.getByText("int")).toBeInTheDocument();
    expect(screen.getByText("bigint")).toBeInTheDocument();
  });

  it("입력값을 바꾸면 COLUMN_TYPES 중 매칭되는 항목만 드롭다운에 필터링되어 보인다", () => {
    render(<TypeSelect value="int" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("타입...");

    fireEvent.change(input, { target: { value: "json" } });

    expect(screen.getByText("json")).toBeInTheDocument();
    expect(screen.getByText("jsonb")).toBeInTheDocument();
    expect(screen.queryByText("int")).not.toBeInTheDocument();
  });

  it("옵션을 클릭하면 onChange가 호출되고 입력값이 갱신되며 드롭다운이 닫힌다", () => {
    const onChange = vi.fn();
    render(<TypeSelect value="int" onChange={onChange} />);
    const input = screen.getByPlaceholderText("타입...");

    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByText("bigint"));

    expect(onChange).toHaveBeenCalledWith("bigint");
    expect(input).toHaveValue("bigint");
    expect(screen.queryByText("varchar(255)")).not.toBeInTheDocument();
  });

  it("현재 value와 일치하는 옵션에는 active 클래스가 적용된다", () => {
    render(<TypeSelect value="uuid" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("타입...");
    fireEvent.focus(input);
    // focus 직후에는 inputVal이 value("uuid")로 세팅되어 "uuid" 하나만 필터링되므로,
    // 전체 목록을 보기 위해 빈 문자열로 입력값을 바꾼다.
    fireEvent.change(input, { target: { value: "" } });

    const activeOption = screen.getByText("uuid");
    const inactiveOption = screen.getByText("int");

    expect(activeOption.className).toContain("typeOptionActive");
    expect(inactiveOption.className).not.toContain("typeOptionActive");
  });

  it("Enter를 누르면 현재 입력값을 커밋하고 드롭다운을 닫는다", () => {
    const onChange = vi.fn();
    render(<TypeSelect value="int" onChange={onChange} />);
    const input = screen.getByPlaceholderText("타입...");

    fireEvent.change(input, { target: { value: "decimal(10,2)" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("decimal(10,2)");
    expect(screen.queryByText("varchar(255)")).not.toBeInTheDocument();
  });

  it("Escape를 누르면 입력값을 원래 value로 되돌리고 드롭다운을 닫는다", () => {
    const onChange = vi.fn();
    render(<TypeSelect value="int" onChange={onChange} />);
    const input = screen.getByPlaceholderText("타입...");

    fireEvent.change(input, { target: { value: "something-else" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue("int");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText("varchar(255)")).not.toBeInTheDocument();
  });

  it("빈 문자열로 blur하면 onChange를 호출하지 않고 원래 value로 되돌린다", () => {
    const onChange = vi.fn();
    render(<TypeSelect value="int" onChange={onChange} />);
    const input = screen.getByPlaceholderText("타입...");

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("int");
  });

  it("공백이 아닌 값으로 blur하면 trim된 값으로 onChange를 호출한다", () => {
    const onChange = vi.fn();
    render(<TypeSelect value="int" onChange={onChange} />);
    const input = screen.getByPlaceholderText("타입...");

    fireEvent.change(input, { target: { value: "  bigint  " } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("bigint");
  });

  it("입력값에 매칭되는 타입이 없으면 드롭다운을 렌더링하지 않는다", () => {
    render(<TypeSelect value="int" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("타입...");

    fireEvent.change(input, { target: { value: "no-such-type" } });

    expect(screen.queryByText("int")).not.toBeInTheDocument();
    expect(screen.queryByText("varchar(255)")).not.toBeInTheDocument();
  });
});

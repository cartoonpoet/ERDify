import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaStrip } from "./SchemaStrip";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/useEditorStore";

vi.mock("@/features/editor/store/useEditorStore");
vi.mock("./schema-strip.css", () => ({
  wrapper: "",
  noSchemaStrip: "",
  noSchemaDot: "",
  schemaStrip: "",
  arrowSpan: "",
  hintSpan: "",
  backdrop: "",
  dropdownContainer: "",
  inputWrapper: "",
  dropdownInput: "",
  optionButtonDefault: "",
  optionButtonSelected: "",
  optionDot: "",
  createButton: "",
  divider: "",
  removeButton: "",
}));

const setupStoreMock = (
  state: Partial<Pick<EditorState, "allSchemas" | "schemaColors">> = {}
) => {
  const value = {
    allSchemas: ["public", "billing"],
    schemaColors: {},
    ...state,
  };
  vi.mocked(useEditorStore).mockImplementation(((selector: (s: EditorState) => unknown) =>
    selector(value as unknown as EditorState)) as unknown as typeof useEditorStore);
};

describe("SchemaStrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStoreMock();
  });

  it("schema가 null이면 '+ 스키마 지정' placeholder를 렌더링한다", () => {
    render(<SchemaStrip schema={null} />);
    expect(screen.getByText("+ 스키마 지정")).toBeInTheDocument();
  });

  it("schema가 undefined이면 '+ 스키마 지정' placeholder를 렌더링한다", () => {
    render(<SchemaStrip schema={undefined} />);
    expect(screen.getByText("+ 스키마 지정")).toBeInTheDocument();
  });

  it("schema가 설정되면 스키마 이름과 색상 dot을 렌더링한다", () => {
    const { container } = render(<SchemaStrip schema="public" />);
    expect(screen.getByText("public")).toBeInTheDocument();
    expect(screen.queryByText("+ 스키마 지정")).not.toBeInTheDocument();

    // 스키마 이름 앞에 색상 dot(div)이 인라인 background 스타일로 렌더링된다.
    const dot = Array.from(container.querySelectorAll("div")).find((d) =>
      d.getAttribute("style")?.includes("background:")
    );
    expect(dot).toBeDefined();
  });

  it("onChange가 주어지면 trigger는 role=button을 갖고, Enter를 누르면 드롭다운이 열린다", () => {
    render(<SchemaStrip schema={null} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button");

    expect(screen.queryByPlaceholderText("스키마 입력 또는 선택...")).not.toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.getByPlaceholderText("스키마 입력 또는 선택...")).toBeInTheDocument();
  });

  it("onChange가 주어지면 trigger에서 Space를 누르면 드롭다운이 열린다", () => {
    render(<SchemaStrip schema={null} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button");

    fireEvent.keyDown(trigger, { key: " " });
    expect(screen.getByPlaceholderText("스키마 입력 또는 선택...")).toBeInTheDocument();
  });

  it("onChange가 없으면 trigger에 button role이 없고 클릭해도 드롭다운이 열리지 않는다", () => {
    const { container } = render(<SchemaStrip schema={null} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    const trigger = container.querySelector("div > div") as HTMLElement;
    fireEvent.click(trigger);
    expect(screen.queryByPlaceholderText("스키마 입력 또는 선택...")).not.toBeInTheDocument();
  });

  it("드롭다운에서 스키마 옵션을 선택하면 onChange가 해당 스키마 이름으로 호출된다", () => {
    const onChange = vi.fn();
    render(<SchemaStrip schema={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.mouseDown(screen.getByText("billing"));

    expect(onChange).toHaveBeenCalledWith("billing");
  });

  it("backdrop을 클릭하면 드롭다운이 닫힌다", () => {
    const { container } = render(<SchemaStrip schema={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByPlaceholderText("스키마 입력 또는 선택...")).toBeInTheDocument();

    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(screen.queryByPlaceholderText("스키마 입력 또는 선택...")).not.toBeInTheDocument();
  });
});

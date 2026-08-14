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

  // nodrag/nopan은 React Flow가 드래그/팬으로 가로채지 않게 하는 클래스다.
  // 이게 빠지면 스타일이 아니라 기능이 죽는다(드롭다운 입력이 노드 드래그로 하이재킹됨).
  describe("nodrag/nopan 클래스 보존", () => {
    it("interactive trigger는 nodrag 클래스를 가진다 (schema 없음)", () => {
      render(<SchemaStrip schema={null} onChange={vi.fn()} />);
      expect(screen.getByRole("button").className).toContain("nodrag");
    });

    it("interactive trigger는 nodrag 클래스를 가진다 (schema 있음)", () => {
      render(<SchemaStrip schema="public" onChange={vi.fn()} />);
      expect(screen.getByRole("button").className).toContain("nodrag");
    });

    it("드롭다운 backdrop·컨테이너는 nodrag nopan, 입력과 옵션 버튼은 nodrag를 가진다", () => {
      const { container } = render(<SchemaStrip schema={null} onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button"));

      const backdrop = container.querySelector('[role="presentation"]')!;
      expect(backdrop.className).toContain("nodrag");
      expect(backdrop.className).toContain("nopan");
      const input = screen.getByPlaceholderText("스키마 입력 또는 선택...");
      expect(input.className).toContain("nodrag");
      expect(screen.getByText("billing").closest("button")!.className).toContain("nodrag");
    });
  });

  describe("드롭다운 입력", () => {
    it("입력값으로 스키마 목록을 필터링한다", () => {
      render(<SchemaStrip schema={null} onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button"));

      fireEvent.change(screen.getByPlaceholderText("스키마 입력 또는 선택..."), { target: { value: "bil" } });
      expect(screen.getByText("billing")).toBeInTheDocument();
      expect(screen.queryByText("public")).not.toBeInTheDocument();
    });

    it("입력 후 Enter를 누르면 입력값으로 onChange가 호출되고 드롭다운이 닫힌다", () => {
      const onChange = vi.fn();
      render(<SchemaStrip schema={null} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));

      const input = screen.getByPlaceholderText("스키마 입력 또는 선택...");
      fireEvent.change(input, { target: { value: "audit" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith("audit");
      expect(screen.queryByPlaceholderText("스키마 입력 또는 선택...")).not.toBeInTheDocument();
    });

    it("Escape를 누르면 드롭다운이 닫힌다", () => {
      render(<SchemaStrip schema={null} onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button"));

      fireEvent.keyDown(screen.getByPlaceholderText("스키마 입력 또는 선택..."), { key: "Escape" });
      expect(screen.queryByPlaceholderText("스키마 입력 또는 선택...")).not.toBeInTheDocument();
    });

    it("목록에 없는 값을 입력하면 생성 버튼이 나타나고, 누르면 그 값으로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(<SchemaStrip schema={null} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));

      fireEvent.change(screen.getByPlaceholderText("스키마 입력 또는 선택..."), { target: { value: "audit" } });
      const createBtn = screen.getByText('+ "audit" 스키마 생성');
      fireEvent.mouseDown(createBtn);

      expect(onChange).toHaveBeenCalledWith("audit");
    });
  });

  describe("스키마 해제", () => {
    it("schema가 있으면 해제 버튼이 노출되고, 누르면 onChange(null)이 호출된다", () => {
      const onChange = vi.fn();
      render(<SchemaStrip schema="public" onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));

      fireEvent.mouseDown(screen.getByText("없음 (해제)"));
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("schema가 없으면 해제 버튼이 노출되지 않는다", () => {
      render(<SchemaStrip schema={null} onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.queryByText("없음 (해제)")).not.toBeInTheDocument();
    });
  });

  describe("hover 상태", () => {
    it("interactive schema trigger에 마우스를 올리면 화살표·힌트가 나타난다", () => {
      render(<SchemaStrip schema="public" onChange={vi.fn()} />);
      const trigger = screen.getByRole("button");

      const arrow = screen.getByText("▾");
      const hint = screen.getByText("스키마 변경");
      expect(arrow.getAttribute("style")).toContain("opacity: 0");
      expect(hint.getAttribute("style")).toContain("opacity: 0");

      fireEvent.mouseEnter(trigger);
      expect(arrow.getAttribute("style")).toContain("opacity: 1");
      expect(hint.getAttribute("style")).toContain("opacity: 0.55");

      fireEvent.mouseLeave(trigger);
      expect(arrow.getAttribute("style")).toContain("opacity: 0");
    });
  });
});

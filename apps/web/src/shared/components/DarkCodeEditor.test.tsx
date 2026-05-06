import { render, screen, fireEvent, createEvent } from "@testing-library/react";
import { DarkCodeEditor } from "./DarkCodeEditor";

vi.mock("./DarkCodeEditor.css", () => ({
  container: "container",
  lineNumbers: "lineNumbers",
  lineNumber: "lineNumber",
  editableArea: "editableArea",
  codeArea: "codeArea",
  dragOverlay: "dragOverlay",
}));

describe("DarkCodeEditor", () => {
  it("renders textarea when onChange is provided; renders pre when onChange is not provided", () => {
    const { rerender, container } = render(
      <DarkCodeEditor value="hello" onChange={vi.fn()} />
    );
    expect(container.querySelector("textarea")).toBeInTheDocument();
    expect(container.querySelector("pre")).not.toBeInTheDocument();

    rerender(<DarkCodeEditor value="hello" />);
    expect(container.querySelector("textarea")).not.toBeInTheDocument();
    expect(container.querySelector("pre")).toBeInTheDocument();
  });

  it("renders 3 line number spans for a 3-line value", () => {
    const { container } = render(
      <DarkCodeEditor value={"line1\nline2\nline3"} onChange={vi.fn()} />
    );
    const spans = container.querySelectorAll(".lineNumber");
    expect(spans).toHaveLength(3);
    expect(spans[0].textContent).toBe("1");
    expect(spans[1].textContent).toBe("2");
    expect(spans[2].textContent).toBe("3");
  });

  it("renders 1 line number span when value is empty", () => {
    const { container } = render(<DarkCodeEditor value="" onChange={vi.fn()} />);
    const spans = container.querySelectorAll(".lineNumber");
    expect(spans).toHaveLength(1);
  });

  it("calls onChange when textarea value changes", () => {
    const onChange = vi.fn();
    const { container } = render(<DarkCodeEditor value="" onChange={onChange} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "new text" } });
    expect(onChange).toHaveBeenCalledWith("new text");
  });

  it("shows drag overlay when isDragOver is true, hides when false", () => {
    const { rerender } = render(
      <DarkCodeEditor value="" isDragOver={true} />
    );
    expect(screen.getByText(".sql 파일을 놓으세요")).toBeInTheDocument();

    rerender(<DarkCodeEditor value="" isDragOver={false} />);
    expect(screen.queryByText(".sql 파일을 놓으세요")).not.toBeInTheDocument();
  });

  it("calls onFileDrop with the dropped file", () => {
    const onFileDrop = vi.fn();
    const onDragLeave = vi.fn();
    const { container } = render(
      <DarkCodeEditor value="" onFileDrop={onFileDrop} onDragLeave={onDragLeave} />
    );

    const file = new File(["content"], "schema.sql", { type: "text/plain" });
    const dropTarget = container.firstChild as HTMLElement;
    const dropEvent = createEvent.drop(dropTarget);
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: { files: [file] },
    });
    fireEvent(dropTarget, dropEvent);

    expect(onFileDrop).toHaveBeenCalledWith(file);
    expect(onDragLeave).toHaveBeenCalled();
  });

  it("shows placeholder in pre when value is empty and no onChange", () => {
    render(<DarkCodeEditor value="" placeholder="Enter SQL here" />);
    expect(screen.getByText("Enter SQL here")).toBeInTheDocument();
  });
});

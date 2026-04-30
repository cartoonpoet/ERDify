import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./index";

describe("Modal", () => {
  it("open=true일 때 children을 렌더링한다", () => {
    render(<Modal open onClose={vi.fn()} title="테스트"><div>내용</div></Modal>);
    expect(screen.getByText("내용")).toBeInTheDocument();
  });

  it("open=false일 때 children을 렌더링하지 않는다", () => {
    render(<Modal open={false} onClose={vi.fn()} title="테스트"><div>내용</div></Modal>);
    expect(screen.queryByText("내용")).not.toBeInTheDocument();
  });

  it("Escape 키를 누르면 onClose가 호출된다", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="테스트"><div>내용</div></Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop 클릭 시 onClose가 호출된다", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="테스트"><div>내용</div></Modal>);
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("title prop이 렌더링된다", () => {
    render(<Modal open onClose={vi.fn()} title="조직 만들기"><div>내용</div></Modal>);
    expect(screen.getByText("조직 만들기")).toBeInTheDocument();
  });

  it("패널 내부 클릭 시 onClose가 호출되지 않는다", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="테스트"><div data-testid="panel-child">내용</div></Modal>);
    fireEvent.click(screen.getByTestId("panel-child"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

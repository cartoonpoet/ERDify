import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./index";

describe("Button", () => {
  it("children을 렌더링한다", () => {
    render(<Button>저장</Button>);
    expect(screen.getByText("저장")).toBeInTheDocument();
  });

  it("onClick이 호출된다", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);
    fireEvent.click(screen.getByText("저장"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled 상태에서 onClick이 호출되지 않는다", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>저장</Button>);
    fireEvent.click(screen.getByText("저장"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("type='submit'이 button 엘리먼트에 전달된다", () => {
    render(<Button type="submit">제출</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});

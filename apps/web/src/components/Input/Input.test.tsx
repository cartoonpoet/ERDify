import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./index";

describe("Input", () => {
  it("placeholder를 렌더링한다", () => {
    render(<Input placeholder="이메일 입력" />);
    expect(screen.getByPlaceholderText("이메일 입력")).toBeInTheDocument();
  });

  it("error prop이 있으면 에러 메시지를 보여준다", () => {
    render(<Input error="필수 항목입니다" />);
    expect(screen.getByText("필수 항목입니다")).toBeInTheDocument();
  });

  it("onChange가 호출된다", () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("label prop이 있으면 label을 렌더링한다", () => {
    render(<Input label="이메일" id="email" />);
    expect(screen.getByText("이메일")).toBeInTheDocument();
  });
});

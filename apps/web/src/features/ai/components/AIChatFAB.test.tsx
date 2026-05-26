import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIChatFAB } from "./AIChatFAB";

describe("AIChatFAB", () => {
  let onClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClick = vi.fn();
  });

  it("버튼이 렌더링된다", () => {
    render(<AIChatFAB onClick={onClick} />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("버튼 클릭 시 onClick prop이 호출된다", () => {
    render(<AIChatFAB onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("버튼에 title='AI 어시스턴트' 속성이 있다", () => {
    render(<AIChatFAB onClick={onClick} />);

    expect(screen.getByTitle("AI 어시스턴트")).toBeInTheDocument();
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateBanner } from "./UpdateBanner";
import { useVersionPolling } from "@/features/editor/hooks/useVersionPolling";

vi.mock("@/features/editor/hooks/useVersionPolling");

vi.mock("./UpdateBanner.css", () => ({
  banner: "banner",
  message: "message",
  refreshBtn: "refreshBtn",
  dismissBtn: "dismissBtn",
}));

describe("UpdateBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hasUpdate가 false이면 아무것도 렌더링하지 않는다", () => {
    vi.mocked(useVersionPolling).mockReturnValue(false);
    const { container } = render(<UpdateBanner />);

    expect(container.firstChild).toBeNull();
  });

  it("hasUpdate가 true이면 output 요소로 배너를 렌더링한다", () => {
    vi.mocked(useVersionPolling).mockReturnValue(true);
    const { container } = render(<UpdateBanner />);

    const outputEl = container.querySelector("output");
    expect(outputEl).not.toBeNull();
    expect(screen.getByText("새 버전이 배포되었습니다.")).toBeInTheDocument();
  });

  it("'새로고침' 버튼 클릭 시 window.location.reload가 호출된다", () => {
    vi.mocked(useVersionPolling).mockReturnValue(true);
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(<UpdateBanner />);
    fireEvent.click(screen.getByText("새로고침"));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("'닫기' 버튼 클릭 시 배너가 사라진다", () => {
    vi.mocked(useVersionPolling).mockReturnValue(true);
    const { container } = render(<UpdateBanner />);

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(container.querySelector("output")).toBeNull();
  });
});

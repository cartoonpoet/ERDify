import type { ComponentProps } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIChatSessionSelector } from "./AIChatSessionSelector";
import type { AiSession } from "../store/aiChatSlice";

const SESSIONS: AiSession[] = [
  { id: "sess-1", name: "첫 번째 대화", createdAt: "2026-01-01T00:00:00Z" },
  { id: "sess-2", name: "두 번째 대화", createdAt: "2026-01-02T00:00:00Z" },
];

const onSelectSession = vi.fn();
const onNewSession = vi.fn();

const renderSelector = (
  overrides?: Partial<ComponentProps<typeof AIChatSessionSelector>>,
) =>
  render(
    <AIChatSessionSelector
      sessions={SESSIONS}
      currentSessionId={null}
      onSelectSession={onSelectSession}
      onNewSession={onNewSession}
      {...overrides}
    />,
  );

/** 드롭다운 토글 버튼 — 라벨 텍스트로 조회한다. */
const getToggleBtn = (label: RegExp) => screen.getByRole("button", { name: label });

beforeEach(() => {
  onSelectSession.mockReset();
  onNewSession.mockReset();
});

describe("AIChatSessionSelector — 라벨 표시", () => {
  it("currentSessionId가 없으면 '새 대화' 라벨을 표시한다", () => {
    renderSelector();

    expect(getToggleBtn(/새 대화/)).toBeInTheDocument();
  });

  it("currentSessionId에 해당하는 세션이 있으면 세션 이름을 라벨로 표시한다", () => {
    renderSelector({ currentSessionId: "sess-2" });

    expect(getToggleBtn(/두 번째 대화/)).toBeInTheDocument();
  });
});

describe("AIChatSessionSelector — 드롭다운 토글", () => {
  it("초기 상태에서 aria-expanded=false이고 세션 목록이 보이지 않는다", () => {
    renderSelector();

    expect(getToggleBtn(/새 대화/)).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "첫 번째 대화" })).not.toBeInTheDocument();
  });

  it("토글 버튼 클릭 시 aria-expanded=true가 되고 세션 목록이 열린다", () => {
    renderSelector();

    fireEvent.click(getToggleBtn(/새 대화/));

    expect(getToggleBtn(/새 대화/)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "첫 번째 대화" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "두 번째 대화" })).toBeInTheDocument();
  });

  it("토글 버튼을 다시 클릭하면 목록이 닫힌다", () => {
    renderSelector();

    fireEvent.click(getToggleBtn(/새 대화/));
    fireEvent.click(getToggleBtn(/새 대화/));

    expect(getToggleBtn(/새 대화/)).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "첫 번째 대화" })).not.toBeInTheDocument();
  });
});

describe("AIChatSessionSelector — 세션 선택", () => {
  it("현재 세션 항목은 활성 스타일 클래스가 추가된다", () => {
    renderSelector({ currentSessionId: "sess-1" });

    fireEvent.click(getToggleBtn(/첫 번째 대화/));

    // 토글 버튼의 접근성 이름은 화살표(▾)를 포함하므로 정확 일치 조회는 목록 항목만 반환한다
    const activeItem = screen.getByRole("button", { name: "첫 번째 대화" });
    const inactiveItem = screen.getByRole("button", { name: "두 번째 대화" });
    // 활성 항목은 비활성 항목보다 클래스가 하나 더 붙는다 (dropdownItemActive)
    expect(activeItem.classList.length).toBe(inactiveItem.classList.length + 1);
  });

  it("세션 항목 클릭 시 onSelectSession이 해당 id로 호출되고 드롭다운이 닫힌다", () => {
    renderSelector();

    fireEvent.click(getToggleBtn(/새 대화/));
    fireEvent.click(screen.getByRole("button", { name: "두 번째 대화" }));

    expect(onSelectSession).toHaveBeenCalledWith("sess-2");
    expect(getToggleBtn(/새 대화/)).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "두 번째 대화" })).not.toBeInTheDocument();
  });
});

describe("AIChatSessionSelector — 새 세션", () => {
  it("'+ 새 세션' 클릭 시 onNewSession이 호출되고 드롭다운이 닫힌다", () => {
    renderSelector();

    fireEvent.click(getToggleBtn(/새 대화/));
    fireEvent.click(screen.getByRole("button", { name: "+ 새 세션" }));

    expect(onNewSession).toHaveBeenCalledTimes(1);
    expect(getToggleBtn(/새 대화/)).toHaveAttribute("aria-expanded", "false");
  });
});

describe("AIChatSessionSelector — 백드롭 dismiss", () => {
  it("드롭다운이 닫혀 있으면 백드롭이 렌더링되지 않는다", () => {
    const { container } = renderSelector();

    expect(container.querySelector('[role="presentation"]')).not.toBeInTheDocument();
  });

  it("백드롭 클릭 시 드롭다운이 닫힌다", () => {
    const { container } = renderSelector();

    fireEvent.click(getToggleBtn(/새 대화/));
    const backdrop = container.querySelector('[role="presentation"]')!;
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop);

    expect(getToggleBtn(/새 대화/)).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "첫 번째 대화" })).not.toBeInTheDocument();
  });
});

describe("AIChatSessionSelector — 빈 세션 목록", () => {
  it("세션이 없으면 '이전 세션이 없습니다' 메시지를 표시한다", () => {
    renderSelector({ sessions: [] });

    fireEvent.click(getToggleBtn(/새 대화/));

    expect(screen.getByText("이전 세션이 없습니다")).toBeInTheDocument();
  });
});

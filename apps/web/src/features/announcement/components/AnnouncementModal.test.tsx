import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { AnnouncementResponse } from "@erdify/contracts";
import { AnnouncementModal } from "./AnnouncementModal";

vi.mock("./AnnouncementModal.css", () => ({
  backdrop: "", panel: "", header: "", headerTitle: "", counter: "", closeBtn: "",
  dots: "", dot: "", dotActive: "", divider: "", navRow: "", navBtn: "", noShow: "", spacer: "", confirmBtn: "",
}));
vi.mock("./AnnouncementSlide.css", () => ({
  root: "", tag: "", tagMaintenance: "", tagError: "", tagFeature: "", tagGeneral: "",
  slideTitle: "", slideBody: "", urgentNote: "",
}));

const makeA = (overrides: Partial<AnnouncementResponse> = {}): AnnouncementResponse => ({
  id: "a1", title: "점검", content: "내용", type: "maintenance",
  isUrgent: false, startsAt: new Date().toISOString(), endsAt: null, createdAt: new Date().toISOString(),
  ...overrides,
});

describe("AnnouncementModal", () => {
  it("unread가 없으면 렌더하지 않는다", () => {
    const { container } = render(
      <AnnouncementModal unread={[]} onMarkSeen={vi.fn()} onMarkAllSeen={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("공지 1개: 페이지네이션 dot 없음", () => {
    render(
      <AnnouncementModal unread={[makeA()]} onMarkSeen={vi.fn()} onMarkAllSeen={vi.fn()} />
    );
    expect(screen.queryByTestId("pagination-dots")).toBeNull();
  });

  it("공지 2개 이상: pagination dots 표시", () => {
    render(
      <AnnouncementModal
        unread={[makeA({ id: "a1" }), makeA({ id: "a2", title: "공지2" })]}
        onMarkSeen={vi.fn()} onMarkAllSeen={vi.fn()}
      />
    );
    expect(screen.getByTestId("pagination-dots")).toBeDefined();
  });

  it("urgent 슬라이드: '다시 보지 않기' 없음", () => {
    render(
      <AnnouncementModal
        unread={[makeA({ isUrgent: true })]}
        onMarkSeen={vi.fn()} onMarkAllSeen={vi.fn()}
      />
    );
    expect(screen.queryByText("다시 보지 않기")).toBeNull();
  });

  it("일반 슬라이드: '다시 보지 않기' 있음", () => {
    render(
      <AnnouncementModal
        unread={[makeA({ isUrgent: false })]}
        onMarkSeen={vi.fn()} onMarkAllSeen={vi.fn()}
      />
    );
    expect(screen.getByText("다시 보지 않기")).toBeDefined();
  });

  it("마지막 슬라이드: '확인' 버튼 클릭 시 onMarkAllSeen 호출", () => {
    const onMarkAllSeen = vi.fn();
    render(
      <AnnouncementModal unread={[makeA()]} onMarkSeen={vi.fn()} onMarkAllSeen={onMarkAllSeen} />
    );
    fireEvent.click(screen.getByText("확인"));
    expect(onMarkAllSeen).toHaveBeenCalledOnce();
  });

  it("'다시 보지 않기' 클릭 시 onMarkSeen(id) 호출", () => {
    const onMarkSeen = vi.fn();
    render(
      <AnnouncementModal unread={[makeA({ id: "a1" })]} onMarkSeen={onMarkSeen} onMarkAllSeen={vi.fn()} />
    );
    fireEvent.click(screen.getByText("다시 보지 않기"));
    expect(onMarkSeen).toHaveBeenCalledWith("a1");
  });
});

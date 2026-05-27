import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnnouncementResponse } from "@erdify/contracts";
import { useAnnouncements } from "./useAnnouncements";
import { getActiveAnnouncements } from "@/shared/api/announcements.api";
import React from "react";

vi.mock("@/shared/api/announcements.api", () => ({ getActiveAnnouncements: vi.fn() }));

const makeAnnouncement = (overrides: Partial<AnnouncementResponse> = {}): AnnouncementResponse => ({
  id: "a1",
  title: "점검",
  content: "내용",
  type: "maintenance",
  isUrgent: false,
  startsAt: new Date().toISOString(),
  endsAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children)
);

describe("useAnnouncements", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getActiveAnnouncements).mockResolvedValue([]);
  });

  it("이미 읽은 공지는 unread에서 제외한다", async () => {
    localStorage.setItem("seen_announcements", JSON.stringify(["a1"]));
    vi.mocked(getActiveAnnouncements).mockResolvedValue([makeAnnouncement({ id: "a1" })]);
    const { result } = renderHook(() => useAnnouncements(), { wrapper });
    await waitFor(() => expect(result.current.unread).toHaveLength(0));
  });

  it("urgent 공지는 seen에 있어도 unread에 포함한다", async () => {
    localStorage.setItem("seen_announcements", JSON.stringify(["a1"]));
    vi.mocked(getActiveAnnouncements).mockResolvedValue([makeAnnouncement({ id: "a1", isUrgent: true })]);
    const { result } = renderHook(() => useAnnouncements(), { wrapper });
    await waitFor(() => expect(result.current.unread).toHaveLength(1));
  });

  it("markSeen은 해당 공지 ID를 localStorage에 추가한다", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue([makeAnnouncement({ id: "a2" })]);
    const { result } = renderHook(() => useAnnouncements(), { wrapper });
    await waitFor(() => expect(result.current.unread).toHaveLength(1));
    result.current.markSeen("a2");
    const stored = JSON.parse(localStorage.getItem("seen_announcements") ?? "[]") as string[];
    expect(stored).toContain("a2");
  });

  it("markAllSeen은 unread 공지 모두를 localStorage에 추가한다", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue([
      makeAnnouncement({ id: "a3" }),
      makeAnnouncement({ id: "a4" }),
    ]);
    const { result } = renderHook(() => useAnnouncements(), { wrapper });
    await waitFor(() => expect(result.current.unread).toHaveLength(2));
    result.current.markAllSeen();
    const stored = JSON.parse(localStorage.getItem("seen_announcements") ?? "[]") as string[];
    expect(stored).toContain("a3");
    expect(stored).toContain("a4");
  });
});

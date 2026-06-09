import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as announcementsApi from "@/shared/api/admin-announcements.api";
import type { AnnouncementResponse } from "@erdify/contracts";
import { AnnouncementsAdminPage } from "@/features/admin/pages/AnnouncementsAdminPage";

vi.mock("@/shared/api/admin-announcements.api");
vi.mock("@/features/admin/components/AnnouncementForm", () => ({
  AnnouncementForm: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="announcement-form"><button onClick={onClose}>폼닫기</button></div> : null,
}));
vi.mock("@/shared/components/Button", () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));
vi.mock("@/features/admin/pages/announcements-admin-page.css", () => ({
  page: "", pageHeader: "", pageTitle: "", listArea: "", emptyState: "",
  announcementCard: "", cardTop: "", cardTitle: "", activeBadge: "", expiredBadge: "",
  urgentBadge: "", cardMeta: "", cardActions: "", actionBtn: "", deleteBtn: "",
}));

const createQc = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const wrap = () =>
  render(
    <QueryClientProvider client={createQc()}>
      <AnnouncementsAdminPage />
    </QueryClientProvider>,
  );

const activeAnnouncement: AnnouncementResponse = {
  id: "a1",
  title: "점검 공지",
  content: "서버 점검 예정",
  type: "maintenance",
  isUrgent: false,
  startsAt: new Date(Date.now() - 1000).toISOString(),
  endsAt: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

it("공지 목록을 렌더링한다", async () => {
  vi.mocked(announcementsApi.adminListAnnouncements).mockResolvedValue([activeAnnouncement]);
  wrap();
  expect(await screen.findByText("점검 공지")).toBeInTheDocument();
});

it("공지가 없으면 빈 상태 메시지를 표시한다", async () => {
  vi.mocked(announcementsApi.adminListAnnouncements).mockResolvedValue([]);
  wrap();
  expect(await screen.findByText("📭 등록된 공지가 없습니다.")).toBeInTheDocument();
});

it("'+ 새 공지 작성' 클릭 시 AnnouncementForm이 열린다", async () => {
  vi.mocked(announcementsApi.adminListAnnouncements).mockResolvedValue([]);
  wrap();
  await screen.findByText("📭 등록된 공지가 없습니다.");
  fireEvent.click(screen.getByRole("button", { name: "+ 새 공지 작성" }));
  expect(screen.getByTestId("announcement-form")).toBeInTheDocument();
});

it("'수정' 클릭 시 AnnouncementForm이 열린다", async () => {
  vi.mocked(announcementsApi.adminListAnnouncements).mockResolvedValue([activeAnnouncement]);
  wrap();
  await screen.findByText("점검 공지");
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  expect(screen.getByTestId("announcement-form")).toBeInTheDocument();
});

it("'삭제' 클릭 후 confirm 승인 시 adminDeleteAnnouncement가 호출된다", async () => {
  vi.mocked(announcementsApi.adminListAnnouncements).mockResolvedValue([activeAnnouncement]);
  vi.mocked(announcementsApi.adminDeleteAnnouncement).mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  wrap();
  await screen.findByText("점검 공지");
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  await waitFor(() => {
    const spy = vi.mocked(announcementsApi.adminDeleteAnnouncement);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toBe("a1");
  });
  vi.unstubAllGlobals();
});

it("'삭제' 클릭 후 confirm 취소 시 adminDeleteAnnouncement가 호출되지 않는다", async () => {
  vi.mocked(announcementsApi.adminListAnnouncements).mockResolvedValue([activeAnnouncement]);
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
  wrap();
  await screen.findByText("점검 공지");
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  expect(announcementsApi.adminDeleteAnnouncement).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

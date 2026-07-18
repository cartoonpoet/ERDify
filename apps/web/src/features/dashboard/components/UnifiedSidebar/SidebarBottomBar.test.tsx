import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarBottomBar } from "./SidebarBottomBar";

vi.mock("./unified-sidebar.css", () => ({
  sidebarBottomBar: "",
  projRow: "",
  projRowActive: "",
  projArrow: "",
  projIcon: "",
  projName: "",
}));

const mockNavigate = vi.fn();
let mockPathname = "/";
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: mockPathname }),
  };
});

vi.mock("@/shared/api/auth.api", () => ({ getMe: vi.fn() }));

import { getMe } from "@/shared/api/auth.api";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (ui: React.ReactElement) => {
  const qc = makeQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

const makeMe = (isAdmin: boolean) => ({
  id: "u1",
  email: "a@b.com",
  name: "Test User",
  phone: null,
  avatarUrl: null,
  isAdmin,
});

describe("SidebarBottomBar", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPathname = "/";
    vi.mocked(getMe).mockResolvedValue(makeMe(false));
  });

  it("일반 사용자는 API 키 버튼만 렌더링한다", async () => {
    wrap(<SidebarBottomBar orgId="org-1" apiKeysActive={false} />);
    expect(await screen.findByText("API 키")).toBeInTheDocument();
    expect(screen.queryByText("에러 리포트")).not.toBeInTheDocument();
    expect(screen.queryByText("공지 관리")).not.toBeInTheDocument();
  });

  it("API 키 버튼 클릭 시 orgId가 있으면 navigate가 호출된다", async () => {
    wrap(<SidebarBottomBar orgId="org-1" apiKeysActive={false} />);
    fireEvent.click(await screen.findByText("API 키"));
    expect(mockNavigate).toHaveBeenCalledWith("/org-1/api-keys");
  });

  it("API 키 버튼 클릭 시 orgId가 없으면 navigate가 호출되지 않는다", async () => {
    wrap(<SidebarBottomBar orgId={undefined} apiKeysActive={false} />);
    fireEvent.click(await screen.findByText("API 키"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("apiKeysActive가 true면 API 키 버튼의 aria-pressed가 true다", async () => {
    wrap(<SidebarBottomBar orgId="org-1" apiKeysActive={true} />);
    const btn = await screen.findByText("API 키");
    expect(btn.closest("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("관리자는 에러 리포트/공지 관리 버튼도 렌더링한다", async () => {
    vi.mocked(getMe).mockResolvedValue(makeMe(true));
    wrap(<SidebarBottomBar orgId="org-1" apiKeysActive={false} />);
    expect(await screen.findByText("에러 리포트")).toBeInTheDocument();
    expect(screen.getByText("공지 관리")).toBeInTheDocument();
  });

  it("에러 리포트 버튼 클릭 시 /admin/error-reports로 navigate가 호출된다", async () => {
    vi.mocked(getMe).mockResolvedValue(makeMe(true));
    wrap(<SidebarBottomBar orgId="org-1" apiKeysActive={false} />);
    fireEvent.click(await screen.findByText("에러 리포트"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/error-reports");
  });

  it("공지 관리 버튼 클릭 시 /admin/announcements로 navigate가 호출된다", async () => {
    vi.mocked(getMe).mockResolvedValue(makeMe(true));
    wrap(<SidebarBottomBar orgId="org-1" apiKeysActive={false} />);
    fireEvent.click(await screen.findByText("공지 관리"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/announcements");
  });

  it("현재 경로가 /admin/error-reports면 에러 리포트 버튼이 활성 상태다", async () => {
    vi.mocked(getMe).mockResolvedValue(makeMe(true));
    mockPathname = "/admin/error-reports";
    wrap(<SidebarBottomBar orgId="org-1" apiKeysActive={false} />);
    const btn = await screen.findByText("에러 리포트");
    expect(btn.closest("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("현재 경로가 /admin/announcements면 공지 관리 버튼이 활성 상태다", async () => {
    vi.mocked(getMe).mockResolvedValue(makeMe(true));
    mockPathname = "/admin/announcements";
    wrap(<SidebarBottomBar orgId="org-1" apiKeysActive={false} />);
    const btn = await screen.findByText("공지 관리");
    expect(btn.closest("button")).toHaveAttribute("aria-pressed", "true");
  });
});

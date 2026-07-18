import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ErrorReportsResponse, GroupedErrorReport } from "@/shared/api/errorReports.api";
import * as errorReportsApi from "@/shared/api/errorReports.api";
import { ErrorReportsPage } from "./ErrorReportsPage";

vi.mock("@/shared/api/errorReports.api");
// ErrorReportsPage와 ErrorReportSlideOver는 동일한 "../admin.css" 모듈을 가리키므로
// (양쪽 컴포넌트가 참조하는 export를 모두 포함해야 함)
vi.mock("../admin.css", () => ({
  page: "",
  header: "",
  pageTitle: "",
  statsRow: "",
  statChip: "",
  statChipCritical: "",
  tabRow: "",
  tab: "",
  tabActive: "",
  list: "",
  errorRow: "",
  errorRowBorderVariants: { "5xx": "", network: "", "403": "", "404": "" },
  typeBadge: "",
  typeBadgeVariants: { "5xx": "", network: "", "403": "", "404": "" },
  rowMeta: "",
  rowPath: "",
  rowTime: "",
  countBadge: "",
  countBadgeMuted: "",
  resolveBtn: "",
  // ErrorReportSlideOver가 사용하는 export
  slideOverBackdrop: "",
  slideOver: "",
  slideOverHeader: "",
  slideOverTitle: "",
  copyBtn: "",
  slideOverClose: "",
  slideOverBody: "",
  detailGrid: "",
  detailLabel: "",
  detailValue: "",
  noteLabel: "",
  occurrenceLoadingText: "",
  occurrenceList: "",
  noteTextarea: "",
  slideOverFooter: "",
  resolveConfirmBtn: "",
  resolveHint: "",
  occurrenceCard: "",
  occurrenceHeader: "",
  occurrenceUserId: "",
  occurrencePageRow: "",
  occurrenceApiRow: "",
  occurrenceSectionLabel: "",
  occurrencePre: "",
}));

const createQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const wrap = () =>
  render(
    <QueryClientProvider client={createQc()}>
      <ErrorReportsPage />
    </QueryClientProvider>,
  );

const unresolvedGroup: GroupedErrorReport = {
  errorType: "5xx",
  path: "/api/orgs",
  count: 2,
  firstSeen: "2026-01-01T00:00:00.000Z",
  lastSeen: "2026-01-02T00:00:00.000Z",
  resolved: false,
};

const resolvedGroup: GroupedErrorReport = {
  errorType: "404",
  path: "/api/old",
  count: 1,
  firstSeen: "2026-01-01T00:00:00.000Z",
  lastSeen: "2026-01-02T00:00:00.000Z",
  resolved: true,
};

const stats = { "5xx": 2, network: 0, "403": 0, "404": 1 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(errorReportsApi.getErrorReportOccurrences).mockResolvedValue([]);
  vi.mocked(errorReportsApi.resolveErrorReport).mockResolvedValue(undefined);
  vi.mocked(errorReportsApi.getErrorReports).mockImplementation(
    async (params): Promise<ErrorReportsResponse> => ({
      groups: params.resolved ? [resolvedGroup] : [unresolvedGroup],
      stats,
    }),
  );
});

describe("ErrorReportsPage", () => {
  it("mocked getErrorReports로부터 에러 리포트 목록을 렌더링한다", async () => {
    wrap();
    expect(await screen.findByText("/api/orgs")).toBeInTheDocument();
  });

  it("행 클릭 시 ErrorReportSlideOver가 열린다", async () => {
    wrap();
    fireEvent.click(await screen.findByText("/api/orgs"));
    expect(await screen.findByText("에러 상세")).toBeInTheDocument();
  });

  it("행 자체는 인터랙티브 role을 갖지 않는다 (내부 '해결' 버튼과의 중첩 방지)", async () => {
    wrap();
    await screen.findByText("/api/orgs");
    expect(screen.queryByRole("button", { name: /\/api\/orgs/ })).not.toBeInTheDocument();
  });

  it("'해결 →' 버튼 클릭 시 ErrorReportSlideOver가 열린다 (키보드 사용자의 접근 경로)", async () => {
    wrap();
    fireEvent.click(await screen.findByRole("button", { name: "해결 →" }));
    expect(await screen.findByText("에러 상세")).toBeInTheDocument();
  });

  it("탭을 '해결됨'으로 전환하면 getErrorReports가 resolved: true로 다시 호출된다", async () => {
    wrap();
    await screen.findByText("/api/orgs");

    fireEvent.click(screen.getByRole("button", { name: "해결됨" }));

    await waitFor(() => {
      expect(errorReportsApi.getErrorReports).toHaveBeenCalledWith(
        expect.objectContaining({ resolved: true }),
      );
    });
    expect(await screen.findByText("/api/old")).toBeInTheDocument();
  });
});

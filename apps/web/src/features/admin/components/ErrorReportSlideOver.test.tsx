import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { GroupedErrorReport, OccurrenceItem } from "@/shared/api/errorReports.api";
import * as errorReportsApi from "@/shared/api/errorReports.api";
import { ErrorReportSlideOver } from "./ErrorReportSlideOver";

vi.mock("@/shared/api/errorReports.api");
vi.mock("../admin.css", () => ({
  slideOverBackdrop: "",
  slideOver: "",
  slideOverHeader: "",
  slideOverTitle: "",
  copyBtn: "",
  slideOverClose: "",
  slideOverBody: "",
  typeBadge: "",
  typeBadgeVariants: { "5xx": "", network: "", "403": "", "404": "" },
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

const report: GroupedErrorReport = {
  errorType: "5xx",
  path: "/api/orgs",
  count: 3,
  firstSeen: "2026-01-01T00:00:00.000Z",
  lastSeen: "2026-01-02T00:00:00.000Z",
  resolved: false,
};

const occurrences: OccurrenceItem[] = [
  {
    id: "o1",
    createdAt: "2026-01-01T00:00:00.000Z",
    userId: "u1",
    pageName: "조직 목록",
    url: "https://app.example.com/orgs",
    requestMethod: "GET",
    requestBody: null,
    requestParams: null,
    responseBody: null,
    userAgent: "test-agent",
    httpStatus: 500,
  },
];

const wrap = (onClose = vi.fn(), onResolved = vi.fn()) => {
  render(
    <QueryClientProvider client={createQc()}>
      <ErrorReportSlideOver report={report} onClose={onClose} onResolved={onResolved} />
    </QueryClientProvider>,
  );
  return { onClose, onResolved };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(errorReportsApi.getErrorReportOccurrences).mockResolvedValue(occurrences);

  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

describe("ErrorReportSlideOver", () => {
  it("리포트 상세(경로, 발생 횟수)를 렌더링한다", async () => {
    wrap();
    expect(screen.getByText("/api/orgs")).toBeInTheDocument();
    expect(screen.getByText("3회")).toBeInTheDocument();
    await waitFor(() => expect(errorReportsApi.getErrorReportOccurrences).toHaveBeenCalled());
  });

  it("✕ 닫기 버튼 클릭 시 onClose가 호출된다", () => {
    const { onClose } = wrap();
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("배경(backdrop) 클릭 시 onClose가 호출된다", () => {
    const { onClose } = wrap();
    const [backdrop] = screen.getAllByRole("presentation");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("내부 패널 클릭 시 onClose가 호출되지 않는다 (stopPropagation)", () => {
    const { onClose } = wrap();
    const [, panel] = screen.getAllByRole("presentation");
    fireEvent.click(panel!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("메모 입력 후 '해결 완료로 표시' 클릭 시 onResolved가 호출된다", () => {
    const { onResolved } = wrap();
    fireEvent.change(screen.getByPlaceholderText("원인 파악 후 메모..."), {
      target: { value: "원인: 타임아웃" },
    });
    fireEvent.click(screen.getByText("✓ 해결 완료로 표시"));
    expect(onResolved).toHaveBeenCalledWith("/api/orgs", "5xx", "원인: 타임아웃");
  });

  it("'Claude에게 복사' 클릭 시 Request/Response Body와 Params를 포함한 텍스트를 클립보드에 복사한다", async () => {
    const fullOccurrence: OccurrenceItem = {
      id: "o2",
      createdAt: "2026-01-03T00:00:00.000Z",
      userId: "u2",
      pageName: "조직 상세",
      url: "https://app.example.com/orgs/1",
      requestMethod: "POST",
      requestBody: '{"name":"acme"}',
      requestParams: '{"page":1}',
      responseBody: '{"error":"internal"}',
      userAgent: "test-agent-2",
      httpStatus: 500,
    };
    vi.mocked(errorReportsApi.getErrorReportOccurrences).mockResolvedValue([fullOccurrence]);

    wrap();
    await waitFor(() => expect(screen.getByText("조직 상세")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Claude에게 복사"));

    await waitFor(() => expect(screen.getByText("✓ 복사됨")).toBeInTheDocument());

    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    expect(writeText).toHaveBeenCalledTimes(1);
    const copiedText = writeText.mock.calls[0]![0] as string;

    expect(copiedText).toContain("- **URL**: https://app.example.com/orgs/1");
    expect(copiedText).toContain("- **요청**: POST /api/orgs (HTTP 500)");
    expect(copiedText).toContain("- **Request Body**:");
    expect(copiedText).toContain('"name": "acme"');
    expect(copiedText).toContain("- **Request Params**:");
    expect(copiedText).toContain('"page": 1');
    expect(copiedText).toContain("- **Response Body**:");
    expect(copiedText).toContain('"error": "internal"');
    expect(copiedText).toContain("- **Browser**: test-agent-2");
  });

  it("Request/Response Body가 없는 발생건은 해당 섹션 없이 복사된다", async () => {
    wrap();
    // API가 호출된 것만으로는 응답이 반영돼 렌더링됐다는 보장이 없으므로,
    // 실제 발생건 내용이 화면에 나타날 때까지 기다린다.
    await waitFor(() => expect(screen.getByText("조직 목록")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Claude에게 복사"));

    await waitFor(() => {
      const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    const copiedText = writeText.mock.calls[0]![0] as string;

    expect(copiedText).toContain("- **URL**: https://app.example.com/orgs");
    expect(copiedText).toContain("- **요청**: GET /api/orgs (HTTP 500)");
    expect(copiedText).toContain("- **Browser**: test-agent");
    expect(copiedText).not.toContain("- **Request Body**:");
    expect(copiedText).not.toContain("- **Request Params**:");
    expect(copiedText).not.toContain("- **Response Body**:");
  });
});

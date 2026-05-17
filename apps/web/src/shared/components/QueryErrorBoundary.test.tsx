import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryErrorBoundary } from "./QueryErrorBoundary";

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
afterAll(() => { consoleError.mockRestore(); });

const Throw = ({ error }: { error: unknown }) => { throw error; };

const wrap = (
  error: unknown,
  variant: "page" | "inline" = "page",
  props: { backLabel?: string; backPath?: string } = {},
) => {
  const qc = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <QueryErrorBoundary variant={variant} {...props}>
          <Throw error={error} />
        </QueryErrorBoundary>
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe("QueryErrorBoundary — error messages", () => {
  it("shows 접근 권한이 없습니다 for 403", () => {
    wrap({ response: { status: 403 } });
    expect(screen.getByText("접근 권한이 없습니다")).toBeInTheDocument();
  });
  it("shows ERD 목록을 찾을 수 없습니다 for 404", () => {
    wrap({ response: { status: 404 } });
    expect(screen.getByText("ERD 목록을 찾을 수 없습니다")).toBeInTheDocument();
  });
  it("shows 서버 오류 for 500", () => {
    wrap({ response: { status: 500 } });
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
  });
  it("shows 서버 오류 for 503", () => {
    wrap({ response: { status: 503 } });
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
  });
  it("shows 연결 오류 for unknown error", () => {
    wrap(new Error("Network Error"));
    expect(screen.getByText("연결 오류")).toBeInTheDocument();
  });
});

describe("QueryErrorBoundary — page variant", () => {
  it("renders default backLabel '홈으로 이동'", () => {
    wrap({ response: { status: 500 } }, "page");
    expect(screen.getByRole("button", { name: "홈으로 이동" })).toBeInTheDocument();
  });
  it("renders custom backLabel", () => {
    wrap({ response: { status: 500 } }, "page", { backLabel: "대시보드로 이동" });
    expect(screen.getByRole("button", { name: "대시보드로 이동" })).toBeInTheDocument();
  });
  it("does not render guide text in page variant", () => {
    wrap({ response: { status: 500 } }, "page");
    expect(screen.queryByText(/문제가 지속/)).not.toBeInTheDocument();
  });
});

describe("QueryErrorBoundary — inline variant", () => {
  it("renders 다시 시도 button for retryable errors (5xx)", () => {
    wrap({ response: { status: 500 } }, "inline");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
  it("renders 다시 시도 button for network errors", () => {
    wrap(new Error("Network"), "inline");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
  it("does NOT render retry button for 403", () => {
    wrap({ response: { status: 403 } }, "inline");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("does NOT render retry button for 404", () => {
    wrap({ response: { status: 404 } }, "inline");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("renders guide text for inline variant", () => {
    wrap({ response: { status: 500 } }, "inline");
    expect(screen.getByText("문제가 지속되면 페이지를 새로고침해 주세요")).toBeInTheDocument();
  });
  it("renders 403 guide text without retry button", () => {
    wrap({ response: { status: 403 } }, "inline");
    expect(screen.getByText(/사이드바에서 다른 프로젝트/)).toBeInTheDocument();
  });
});

describe("QueryErrorBoundary — renders children when no error", () => {
  it("renders children", () => {
    const qc = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <QueryErrorBoundary variant="page">
            <div>정상 콘텐츠</div>
          </QueryErrorBoundary>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("정상 콘텐츠")).toBeInTheDocument();
  });
});

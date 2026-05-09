import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryErrorBoundary } from "./QueryErrorBoundary";

// Suppress React's error boundary console output in test logs
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
afterAll(() => { consoleError.mockRestore(); });

const Throw = ({ error }: { error: unknown }) => { throw error; };

const wrap = (error: unknown, variant: "page" | "inline" = "page") =>
  render(
    <MemoryRouter>
      <QueryErrorBoundary variant={variant}>
        <Throw error={error} />
      </QueryErrorBoundary>
    </MemoryRouter>
  );

describe("QueryErrorBoundary", () => {
  it("shows 접근 권한이 없습니다 for status 403", () => {
    wrap({ response: { status: 403 } });
    expect(screen.getByText("접근 권한이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("접근 권한이 없는 다이어그램입니다.")).toBeInTheDocument();
  });

  it("shows 존재하지 않습니다 for status 404", () => {
    wrap({ response: { status: 404 } });
    expect(screen.getByText("존재하지 않습니다")).toBeInTheDocument();
    expect(screen.getByText("존재하지 않거나 삭제된 다이어그램입니다.")).toBeInTheDocument();
  });

  it("shows 서버 오류 for status 500", () => {
    wrap({ response: { status: 500 } });
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
    expect(screen.getByText("서버에 일시적인 문제가 발생했습니다.")).toBeInTheDocument();
  });

  it("shows 서버 오류 for status 503", () => {
    wrap({ response: { status: 503 } });
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
  });

  it("shows 연결 오류 for unknown error shape", () => {
    wrap(new Error("Network Error"));
    expect(screen.getByText("연결 오류")).toBeInTheDocument();
    expect(screen.getByText("네트워크 연결을 확인해 주세요.")).toBeInTheDocument();
  });

  it("renders 돌아가기 button", () => {
    wrap({ response: { status: 403 } });
    expect(screen.getByRole("button", { name: "돌아가기" })).toBeInTheDocument();
  });

  it("renders children when no error", () => {
    render(
      <MemoryRouter>
        <QueryErrorBoundary variant="page">
          <div>정상 콘텐츠</div>
        </QueryErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText("정상 콘텐츠")).toBeInTheDocument();
  });
});

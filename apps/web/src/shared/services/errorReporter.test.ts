import { describe, it, expect, beforeEach, vi } from "vitest";
import { reportError, _resetDedup, sanitize, getPageName } from "./errorReporter";

const fetchMock = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockClear();
  _resetDedup();
});

describe("reportError", () => {
  it("calls POST /api/error-reports with correct payload", async () => {
    reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/error-reports"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"errorType":"5xx"'),
      }),
    );
  });

  it("deduplicates same (errorType, path) within 60s", async () => {
    reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" });
    reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows same path with different error type", async () => {
    reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" });
    reportError({ response: { status: 403 } }, { path: "/api/test", url: "http://app/test" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("swallows fetch failure silently", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(() =>
      reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" }),
    ).not.toThrow();
  });
});

describe("sanitize", () => {
  it("redacts password field", () => {
    expect(sanitize({ password: "secret123", name: "hello" })).toEqual({
      password: "[REDACTED]",
      name: "hello",
    });
  });

  it("redacts nested sensitive fields", () => {
    expect(sanitize({ user: { token: "abc", email: "x@x.com" } })).toEqual({
      user: { token: "[REDACTED]", email: "x@x.com" },
    });
  });

  it("handles arrays", () => {
    expect(sanitize([{ password: "x" }, { name: "y" }])).toEqual([
      { password: "[REDACTED]" },
      { name: "y" },
    ]);
  });

  it("passes non-object values through", () => {
    expect(sanitize("hello")).toBe("hello");
    expect(sanitize(42)).toBe(42);
    expect(sanitize(null)).toBe(null);
  });
});

describe("getPageName", () => {
  it("matches diagram editor route", () => {
    expect(getPageName("/diagrams/abc-123")).toBe("다이어그램 편집");
  });

  it("matches dashboard route", () => {
    expect(getPageName("/org-abc")).toBe("대시보드");
  });

  it("matches login route", () => {
    expect(getPageName("/login")).toBe("로그인");
  });

  it("matches members route", () => {
    expect(getPageName("/org-abc/members")).toBe("멤버 관리");
  });

  it("returns null for unknown path", () => {
    expect(getPageName("/unknown/deep/path")).toBeNull();
  });
});

describe("reportError with Axios context", () => {
  it("includes requestMethod and responseBody in POST body", async () => {
    const axiosError = {
      response: { status: 500, data: { message: "DB error" } },
      config: { method: "post", data: '{"title":"test"}', params: null, url: "/api/diagrams" },
    };
    reportError(axiosError, { path: "/api/diagrams", url: "http://app/diagrams/1" });
    await new Promise((r) => setTimeout(r, 0));
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.requestMethod).toBe("POST");
    expect(body.responseBody).toBe('{"message":"DB error"}');
  });

  it("redacts sensitive fields in requestBody", async () => {
    const axiosError = {
      response: { status: 401, data: { message: "Unauthorized" } },
      config: { method: "post", data: '{"password":"secret","email":"x@x.com"}', params: null, url: "/api/auth/login" },
    };
    reportError(axiosError, { path: "/api/auth/login", url: "http://app/login" });
    await new Promise((r) => setTimeout(r, 0));
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    const parsed = JSON.parse(body.requestBody);
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.email).toBe("x@x.com");
  });
});

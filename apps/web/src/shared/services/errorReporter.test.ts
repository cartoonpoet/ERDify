import { describe, it, expect, beforeEach, vi } from "vitest";
import { reportError, _resetDedup } from "./errorReporter";

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

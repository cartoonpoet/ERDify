import { getErrorStatus, ERROR_CONTENT } from "./queryErrorContent";

describe("getErrorStatus", () => {
  it("returns 403 for status 403", () => {
    expect(getErrorStatus({ response: { status: 403 } })).toBe(403);
  });
  it("returns 404 for status 404", () => {
    expect(getErrorStatus({ response: { status: 404 } })).toBe(404);
  });
  it("returns '5xx' for status 500", () => {
    expect(getErrorStatus({ response: { status: 500 } })).toBe("5xx");
  });
  it("returns '5xx' for status 503", () => {
    expect(getErrorStatus({ response: { status: 503 } })).toBe("5xx");
  });
  it("returns 'network' for unknown error shape", () => {
    expect(getErrorStatus(new Error("Network Error"))).toBe("network");
  });
});

describe("ERROR_CONTENT", () => {
  it("403 is not retryable", () => {
    expect(ERROR_CONTENT[403].retryable).toBe(false);
  });
  it("404 is not retryable", () => {
    expect(ERROR_CONTENT[404].retryable).toBe(false);
  });
  it("5xx is retryable", () => {
    expect(ERROR_CONTENT["5xx"].retryable).toBe(true);
  });
  it("network is retryable", () => {
    expect(ERROR_CONTENT["network"].retryable).toBe(true);
  });
  it("all entries have guide text", () => {
    for (const key of [403, 404, "5xx", "network"] as const) {
      expect(ERROR_CONTENT[key].guide.length).toBeGreaterThan(0);
    }
  });
});

import axios from "axios";
import { onResponseError, setNavigate } from "./httpClient";

describe("httpClient onResponseError interceptor", () => {
  beforeEach(() => setNavigate(null));

  it("navigates to /login?reason=expired on 401 and rejects", async () => {
    const navigate = vi.fn();
    setNavigate(navigate);

    const error = new axios.AxiosError(
      "Unauthorized",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 401, data: null, statusText: "Unauthorized", headers: {}, config: {} as never }
    );

    await expect(onResponseError(error)).rejects.toBe(error);
    expect(navigate).toHaveBeenCalledWith("/login?reason=expired");
  });

  it("does not navigate on 403 and still rejects", async () => {
    const navigate = vi.fn();
    setNavigate(navigate);

    const error = new axios.AxiosError(
      "Forbidden",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 403, data: null, statusText: "Forbidden", headers: {}, config: {} as never }
    );

    await expect(onResponseError(error)).rejects.toBe(error);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not navigate on non-axios errors and still rejects", async () => {
    const navigate = vi.fn();
    setNavigate(navigate);

    const error = new Error("Network Error");
    await expect(onResponseError(error)).rejects.toBe(error);
    expect(navigate).not.toHaveBeenCalled();
  });
});

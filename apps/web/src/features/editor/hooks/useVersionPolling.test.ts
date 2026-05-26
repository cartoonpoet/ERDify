import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVersionPolling } from "./useVersionPolling";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5분

const makeVersionResponse = (buildTime: string) =>
  new Response(JSON.stringify({ buildTime }), { status: 200 });

describe("useVersionPolling", () => {
  beforeEach(() => {
    vi.stubGlobal("__BUILD_TIME__", "build-1");
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeVersionResponse("build-1"))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("초기 상태에서 hasUpdate는 false이다", () => {
    const { result } = renderHook(() => useVersionPolling());

    expect(result.current).toBe(false);
  });

  it("buildTime이 동일하면 hasUpdate가 false로 유지된다", async () => {
    vi.mocked(fetch).mockResolvedValue(makeVersionResponse("build-1"));

    const { result } = renderHook(() => useVersionPolling());

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    await act(async () => {});

    expect(result.current).toBe(false);
  });

  it("buildTime이 다르면 hasUpdate가 true가 된다", async () => {
    vi.mocked(fetch).mockResolvedValue(makeVersionResponse("build-2"));

    const { result } = renderHook(() => useVersionPolling());

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    await act(async () => {});

    expect(result.current).toBe(true);
  });

  it("fetch가 실패하면 hasUpdate가 변경되지 않는다 (에러 무시)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useVersionPolling());

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    await act(async () => {});

    expect(result.current).toBe(false);
  });

  it("fetch 응답이 ok가 아닐 때 hasUpdate가 변경되지 않는다", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 500 })
    );

    const { result } = renderHook(() => useVersionPolling());

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    await act(async () => {});

    expect(result.current).toBe(false);
  });

  it("5분 인터벌마다 fetch를 호출한다", async () => {
    vi.mocked(fetch).mockResolvedValue(makeVersionResponse("build-1"));

    renderHook(() => useVersionPolling());

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    await act(async () => {});

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    await act(async () => {});

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("window focus 이벤트 발생 시 check를 호출한다", async () => {
    vi.mocked(fetch).mockResolvedValue(makeVersionResponse("build-1"));

    renderHook(() => useVersionPolling());

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {});

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("unmount 시 clearInterval과 removeEventListener가 호출된다", async () => {
    vi.mocked(fetch).mockResolvedValue(makeVersionResponse("build-1"));

    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useVersionPolling());

    act(() => {
      unmount();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("focus", expect.any(Function));

    clearIntervalSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("unmount 후에는 인터벌이 실행되지 않는다", async () => {
    vi.mocked(fetch).mockResolvedValue(makeVersionResponse("build-1"));

    const { unmount } = renderHook(() => useVersionPolling());

    act(() => {
      unmount();
    });

    vi.clearAllMocks();

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    });
    await act(async () => {});

    expect(fetch).not.toHaveBeenCalled();
  });
});

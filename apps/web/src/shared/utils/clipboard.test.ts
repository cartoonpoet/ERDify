import { copyToClipboard } from "./clipboard";

describe("copyToClipboard", () => {
  it("navigator.clipboard.writeText가 있을 때 이를 사용한다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await copyToClipboard("hello");

    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("navigator.clipboard가 undefined일 때 execCommand('copy')를 호출한다", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    document.execCommand = vi.fn().mockReturnValue(true);

    await copyToClipboard("fallback text");

    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("폴백: textarea가 DOM에서 제거된다", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    document.execCommand = vi.fn().mockReturnValue(true);

    await copyToClipboard("remove me");

    const textareas = document.querySelectorAll("textarea");
    expect(textareas.length).toBe(0);
  });
});

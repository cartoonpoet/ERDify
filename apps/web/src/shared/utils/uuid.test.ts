import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "./uuid";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("randomUUID", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("crypto.randomUUID를 지원하면 그 값을 그대로 반환한다", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });

    expect(randomUUID()).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("crypto.randomUUID가 없고 getRandomValues만 있으면 그걸로(Math.random이 아니라) v4 UUID를 만든다", () => {
    const getRandomValues = vi.fn((arr: Uint8Array) => {
      arr[0] = 0xab;
      return arr;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    const id = randomUUID();

    expect(id).toMatch(UUID_V4_RE);
    // 출력 형식만 검사하면 구현이 다시 Math.random()으로 회귀해도 통과할 수 있으므로,
    // 실제로 getRandomValues가 엔트로피 소스로 쓰였는지(호출됐는지) 함께 검증한다.
    expect(getRandomValues).toHaveBeenCalled();
  });
});

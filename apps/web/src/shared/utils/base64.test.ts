import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64 } from "./base64";

describe("base64", () => {
  it("서버(Node Buffer)와 같은 문자열로 바꾸고 되돌린다", () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 255]);
    expect(bytesToBase64(bytes)).toBe("AAEC+v8=");
    expect(base64ToBytes("AAEC+v8=")).toEqual(bytes);
  });

  it("나눠 변환하는 경계보다 큰 바이트도 그대로 되돌린다", () => {
    const bytes = Uint8Array.from({ length: 0x8000 * 2 + 3 }, (_, i) => (i * 31) % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

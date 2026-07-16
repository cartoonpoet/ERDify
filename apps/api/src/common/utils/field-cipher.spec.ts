import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createCipheriv } from "crypto";

const KEY_HEX = "0".repeat(64); // 32-byte all-zero key (64 hex chars)

/** 외부에서 KEY_HEX로 암호화한 고정 암호문(다른 프로세스가 DB에 저장한 값을 모사). */
function ciphertextFor(plaintext: string): string {
  const iv = Buffer.alloc(16, 7);
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(KEY_HEX, "hex"), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${enc.toString("hex")}`;
}

describe("field-cipher", () => {
  const original = process.env["FIELD_ENCRYPTION_KEY"];
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => {
    if (original === undefined) delete process.env["FIELD_ENCRYPTION_KEY"];
    else process.env["FIELD_ENCRYPTION_KEY"] = original;
  });

  it("round-trips encrypt → decrypt with the configured key", async () => {
    process.env["FIELD_ENCRYPTION_KEY"] = KEY_HEX;
    const { encrypt, decrypt } = await import("./field-cipher");
    const secret = "sk-proj-abc123";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("reads the key at call time, not module-load time (regression)", async () => {
    // 모듈은 키가 설정되지 않은 상태에서 import된다 (ConfigModule가 .env를 채우기 전 시나리오)
    delete process.env["FIELD_ENCRYPTION_KEY"];
    const { decrypt } = await import("./field-cipher");

    // 이후 키가 채워진다
    process.env["FIELD_ENCRYPTION_KEY"] = KEY_HEX;
    // 그 키로 암호화된 값이 정상 복호화되어야 한다 (모듈 로드시 캡처했다면 dev 키로 bad decrypt)
    expect(decrypt(ciphertextFor("hello-world"))).toBe("hello-world");
  });

  it("throws when FIELD_ENCRYPTION_KEY is not set", async () => {
    delete process.env["FIELD_ENCRYPTION_KEY"];
    const { encrypt } = await import("./field-cipher");
    expect(() => encrypt("x")).toThrow("FIELD_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다");
  });

  it("throws when FIELD_ENCRYPTION_KEY length is not 64 hex chars", async () => {
    process.env["FIELD_ENCRYPTION_KEY"] = "abc123"; // 64자 아님
    const { encrypt } = await import("./field-cipher");
    expect(() => encrypt("x")).toThrow("FIELD_ENCRYPTION_KEY는 64자리 hex 문자열이어야 합니다");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import appConfig from "./app.config";

describe("app.config", () => {
  const originalPersistIntervalMs = process.env["PERSIST_INTERVAL_MS"];
  const originalInviteExpiryDays = process.env["INVITE_EXPIRY_DAYS"];

  const restore = (key: string, original: string | undefined) => {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  };

  beforeEach(() => {
    delete process.env["PERSIST_INTERVAL_MS"];
    delete process.env["INVITE_EXPIRY_DAYS"];
  });

  afterEach(() => {
    restore("PERSIST_INTERVAL_MS", originalPersistIntervalMs);
    restore("INVITE_EXPIRY_DAYS", originalInviteExpiryDays);
  });

  it("falls back to the documented defaults when env vars are unset", () => {
    const config = appConfig();

    expect(config).toEqual({
      persistIntervalMs: 30000,
      inviteExpiryDays: 7,
    });
    expect(config.persistIntervalMs).toBe(30000);
    expect(typeof config.persistIntervalMs).toBe("number");
    expect(config.inviteExpiryDays).toBe(7);
    expect(typeof config.inviteExpiryDays).toBe("number");
  });

  it("parses PERSIST_INTERVAL_MS from the environment as a base-10 integer", () => {
    process.env["PERSIST_INTERVAL_MS"] = "60000";

    const config = appConfig();

    expect(config.persistIntervalMs).toBe(60000);
    expect(typeof config.persistIntervalMs).toBe("number");
  });

  it("parses INVITE_EXPIRY_DAYS from the environment as a base-10 integer", () => {
    process.env["INVITE_EXPIRY_DAYS"] = "14";

    const config = appConfig();

    expect(config.inviteExpiryDays).toBe(14);
    expect(typeof config.inviteExpiryDays).toBe("number");
  });

  it("reads env vars at call time, not module-load time", () => {
    // 모듈은 이미 위에서 import되었지만, registerAs 팩토리는 호출될 때마다 process.env를 다시 읽어야 한다.
    process.env["PERSIST_INTERVAL_MS"] = "1234";
    process.env["INVITE_EXPIRY_DAYS"] = "3";

    expect(appConfig()).toEqual({
      persistIntervalMs: 1234,
      inviteExpiryDays: 3,
    });
  });

  it("truncates non-numeric trailing characters like Number.parseInt(x, 10) does", () => {
    // radix 10 파싱이 실제로 적용되고 있는지 확인 (예: 8진수처럼 취급되지 않음)
    process.env["PERSIST_INTERVAL_MS"] = "08000";
    process.env["INVITE_EXPIRY_DAYS"] = "10abc";

    const config = appConfig();

    expect(config.persistIntervalMs).toBe(8000);
    expect(config.inviteExpiryDays).toBe(10);
  });
});

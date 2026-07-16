import { describe, expect, it } from "vitest";
import { getDatabaseUrl } from "./get-database-url";

describe("getDatabaseUrl", () => {
  it("DATABASE_URL이 있으면 그 값을 반환한다", () => {
    const url = getDatabaseUrl({ DATABASE_URL: "postgres://erdify:erdify@localhost:5432/erdify" });

    expect(url).toBe("postgres://erdify:erdify@localhost:5432/erdify");
  });

  it("DATABASE_URL이 없으면 에러를 던진다", () => {
    expect(() => getDatabaseUrl({})).toThrow("DATABASE_URL 환경변수가 설정되지 않았습니다");
  });
});

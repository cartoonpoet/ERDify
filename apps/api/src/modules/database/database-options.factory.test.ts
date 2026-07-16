import { describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@nestjs/config";
import { createDatabaseModuleOptions } from "./database-options.factory";

const makeConfigService = (databaseUrl: string | undefined) =>
  ({
    get: vi.fn().mockImplementation((key: string) => (key === "DATABASE_URL" ? databaseUrl : undefined))
  }) as unknown as ConfigService;

describe("createDatabaseModuleOptions", () => {
  it("DATABASE_URL이 없으면 에러를 던진다", () => {
    const configService = makeConfigService(undefined);

    expect(() => createDatabaseModuleOptions(configService)).toThrow(
      "DATABASE_URL 환경변수가 설정되지 않았습니다"
    );
  });

  it("DATABASE_URL이 있으면 TypeORM 옵션을 생성한다", () => {
    const configService = makeConfigService("postgres://erdify:erdify@localhost:5432/erdify");

    const options = createDatabaseModuleOptions(configService);

    expect(options).toMatchObject({
      type: "postgres",
      url: "postgres://erdify:erdify@localhost:5432/erdify",
      autoLoadEntities: true,
      maxQueryExecutionTime: 1000,
      logging: ["warn", "error"]
    });
  });
});

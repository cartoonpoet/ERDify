import { describe, expect, it } from "vitest";
import { createTypeOrmOptions } from "./create-typeorm-options";

describe("createTypeOrmOptions", () => {
  it("creates postgres TypeORM options from DATABASE_URL", () => {
    const options = createTypeOrmOptions({
      databaseUrl: "postgres://erdify:erdify@localhost:5432/erdify"
    });

    expect(options.type).toBe("postgres");
    expect(options.url).toBe("postgres://erdify:erdify@localhost:5432/erdify");
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
  });
});

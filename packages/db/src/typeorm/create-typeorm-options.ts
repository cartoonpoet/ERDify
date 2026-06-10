import type { DataSourceOptions } from "typeorm";

type PostgresDataSourceOptions = Extract<DataSourceOptions, { type: "postgres" }>;

interface CreateTypeOrmOptionsInput {
  databaseUrl: string;
  entities?: PostgresDataSourceOptions["entities"];
  migrations?: PostgresDataSourceOptions["migrations"];
  /** 이 시간(ms)을 초과한 쿼리를 느린 쿼리로 경고 로깅한다. 미지정 시 비활성. */
  slowQueryThresholdMs?: number;
}

export function createTypeOrmOptions(input: CreateTypeOrmOptionsInput): PostgresDataSourceOptions {
  return {
    type: "postgres",
    url: input.databaseUrl,
    synchronize: false,
    migrationsRun: false,
    entities: input.entities ?? [],
    migrations: input.migrations ?? [],
    // 느린 쿼리 진단: 임계치 초과 시 TypeORM이 logQuerySlow로 경고를 남긴다.
    ...(input.slowQueryThresholdMs !== undefined
      ? { maxQueryExecutionTime: input.slowQueryThresholdMs, logging: ["warn", "error"] as const }
      : {})
  };
}

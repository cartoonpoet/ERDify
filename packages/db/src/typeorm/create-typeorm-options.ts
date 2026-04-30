import type { DataSourceOptions } from "typeorm";

type PostgresDataSourceOptions = Extract<DataSourceOptions, { type: "postgres" }>;

interface CreateTypeOrmOptionsInput {
  databaseUrl: string;
}

export function createTypeOrmOptions(input: CreateTypeOrmOptionsInput): PostgresDataSourceOptions {
  return {
    type: "postgres",
    url: input.databaseUrl,
    synchronize: false,
    migrationsRun: false,
    entities: [],
    migrations: []
  };
}

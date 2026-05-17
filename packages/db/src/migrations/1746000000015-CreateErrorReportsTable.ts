import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateErrorReportsTable1746000000015 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE "error_reports" (
        "id"            UUID         NOT NULL,
        "error_type"    VARCHAR(10)  NOT NULL,
        "http_status"   INT,
        "path"          VARCHAR(500) NOT NULL,
        "url"           VARCHAR(2000) NOT NULL,
        "user_id"       VARCHAR(36),
        "user_agent"    VARCHAR(500) NOT NULL,
        "resolved_at"   TIMESTAMPTZ,
        "resolved_by"   VARCHAR(36),
        "resolved_note" TEXT,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_error_reports" PRIMARY KEY ("id")
      )
    `);
    await runner.query(`CREATE INDEX "IDX_error_reports_error_type_path" ON "error_reports" ("error_type", "path")`);
    await runner.query(`CREATE INDEX "IDX_error_reports_created_at" ON "error_reports" ("created_at")`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE "error_reports"`);
  }
}

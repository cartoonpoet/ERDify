import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsageLogsTable1746000000021 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "usage_logs" (
        "id"              VARCHAR(36)   NOT NULL,
        "organization_id" VARCHAR(36)   NOT NULL,
        "user_id"         VARCHAR(36)   NOT NULL,
        "event_type"      VARCHAR(50)   NOT NULL,
        "resource_type"   VARCHAR(30),
        "resource_id"     VARCHAR(36),
        "meta"            JSONB,
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_usage_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_usage_logs_org"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_usage_logs_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_usage_logs_org_created"
        ON "usage_logs" ("organization_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_usage_logs_event_type"
        ON "usage_logs" ("event_type", "created_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "usage_logs"`);
  }
}

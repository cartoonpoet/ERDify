import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnnouncementsTable1746000000022 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "announcements" (
        "id"          VARCHAR(36)   NOT NULL,
        "title"       VARCHAR(100)  NOT NULL,
        "content"     TEXT          NOT NULL,
        "type"        VARCHAR(20)   NOT NULL,
        "is_urgent"   BOOLEAN       NOT NULL DEFAULT false,
        "starts_at"   TIMESTAMPTZ   NOT NULL,
        "ends_at"     TIMESTAMPTZ,
        "created_by"  VARCHAR(36)   NOT NULL,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_announcements" PRIMARY KEY ("id"),
        CONSTRAINT "fk_announcements_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_announcements_active"
        ON "announcements" ("starts_at", "ends_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "announcements"`);
  }
}

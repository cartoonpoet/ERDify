import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrganizationAiSettings1746000000017 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "organization_ai_settings" (
        "id"               VARCHAR(36)  NOT NULL,
        "organization_id"  VARCHAR(36)  NOT NULL,
        "encrypted_api_key" TEXT,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_organization_ai_settings" PRIMARY KEY ("id"),
        CONSTRAINT "uq_organization_ai_settings_org" UNIQUE ("organization_id"),
        CONSTRAINT "fk_organization_ai_settings_org"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "organization_ai_settings"`);
  }
}

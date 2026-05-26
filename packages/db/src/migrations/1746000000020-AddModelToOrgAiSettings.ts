import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddModelToOrgAiSettings1746000000020 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE organization_ai_settings ADD COLUMN IF NOT EXISTS model VARCHAR(60) NOT NULL DEFAULT ''`
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE organization_ai_settings DROP COLUMN IF EXISTS model`);
  }
}

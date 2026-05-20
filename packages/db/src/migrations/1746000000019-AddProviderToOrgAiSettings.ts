import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddProviderToOrgAiSettings1746000000019 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE organization_ai_settings ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'anthropic'`
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE organization_ai_settings DROP COLUMN IF EXISTS provider`);
  }
}

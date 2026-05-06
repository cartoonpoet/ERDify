import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameExpiresAtToApiKeys1746000000011 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "api_keys"
        ADD COLUMN IF NOT EXISTS "name"       VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "api_keys"
        DROP COLUMN IF EXISTS "name",
        DROP COLUMN IF EXISTS "expires_at"
    `);
  }
}

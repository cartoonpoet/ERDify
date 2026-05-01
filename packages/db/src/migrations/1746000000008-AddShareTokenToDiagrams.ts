import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddShareTokenToDiagrams1746000000008 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "diagrams"
        ADD COLUMN IF NOT EXISTS "share_token" VARCHAR(36),
        ADD COLUMN IF NOT EXISTS "share_expires_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_diagrams_share_token"
        ON "diagrams" ("share_token")
        WHERE "share_token" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_diagrams_share_token"`);
    await queryRunner.query(`
      ALTER TABLE "diagrams"
        DROP COLUMN IF EXISTS "share_token",
        DROP COLUMN IF EXISTS "share_expires_at"
    `);
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateApiKeysTable1746000000009 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id"         UUID         PRIMARY KEY,
        "user_id"    VARCHAR(36)  NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "key_hash"   VARCHAR(64)  NOT NULL UNIQUE,
        "prefix"     VARCHAR(16)  NOT NULL,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "revoked_at" TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_api_keys_user_id"
        ON "api_keys" ("user_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_api_keys_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
  }
}

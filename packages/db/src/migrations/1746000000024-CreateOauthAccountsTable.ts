import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOauthAccountsTable1746000000024 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE oauth_accounts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL CHECK (provider IN ('kakao', 'naver', 'google')),
        provider_id VARCHAR(255) NOT NULL,
        provider_email VARCHAR(255) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_provider_provider_id UNIQUE (provider, provider_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE oauth_accounts`);
  }
}

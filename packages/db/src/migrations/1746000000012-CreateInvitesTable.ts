import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInvitesTable1746000000012 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE invites (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'editor',
        token VARCHAR(36) UNIQUE NOT NULL,
        invited_by_id VARCHAR(36) NOT NULL REFERENCES users(id),
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_invites_email_accepted ON invites (email, accepted_at)`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE invites`);
  }
}

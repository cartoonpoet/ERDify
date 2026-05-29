import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionIdToAiConversations1746000000025 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_conversations"
        ADD COLUMN "session_id" VARCHAR(36)
    `);

    await queryRunner.query(`
      WITH session_map AS (
        SELECT
          user_id,
          diagram_id,
          gen_random_uuid() AS new_session_id
        FROM (
          SELECT DISTINCT user_id, diagram_id
          FROM "ai_conversations"
        ) AS combos
      )
      UPDATE "ai_conversations" ac
      SET session_id = sm.new_session_id
      FROM session_map sm
      WHERE ac.user_id = sm.user_id
        AND (
          (ac.diagram_id IS NULL AND sm.diagram_id IS NULL) OR
          (ac.diagram_id = sm.diagram_id)
        )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ai_conversations_session"
        ON "ai_conversations" ("session_id", "created_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_ai_conversations_session"`);
    await queryRunner.query(`
      ALTER TABLE "ai_conversations"
        DROP COLUMN "session_id"
    `);
  }
}

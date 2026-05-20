import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAiConversations1746000000018 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_conversations" (
        "id"         VARCHAR(36)  NOT NULL,
        "user_id"    VARCHAR(36)  NOT NULL,
        "diagram_id" VARCHAR(36),
        "role"       VARCHAR(10)  NOT NULL,
        "content"    TEXT         NOT NULL,
        "tool_calls" JSONB,
        "diff"       JSONB,
        "accepted"   BOOLEAN,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ai_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ai_conversations_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ai_conversations_user_created"
        ON "ai_conversations" ("user_id", "created_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_conversations"`);
  }
}

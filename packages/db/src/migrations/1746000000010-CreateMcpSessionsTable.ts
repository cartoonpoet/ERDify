import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMcpSessionsTable1746000000010 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mcp_sessions" (
        "id"                   VARCHAR(36)  NOT NULL,
        "diagram_id"           VARCHAR(36)  NOT NULL,
        "tool_calls"           JSONB        NOT NULL DEFAULT '[]',
        "summary"              VARCHAR(500),
        "snapshot_version_id"  VARCHAR(36),
        "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_mcp_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_mcp_sessions_diagram"
          FOREIGN KEY ("diagram_id") REFERENCES "diagrams"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mcp_sessions"`);
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMcpSessionsTable1746000000010 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mcp_sessions" (
        "id"                   VARCHAR(36)  NOT NULL,
        "diagram_id"           VARCHAR(36)  NOT NULL,
        "tool_calls"           JSONB        NOT NULL DEFAULT '[]',
        "summary"              VARCHAR(500),
        "snapshot_version_id"  VARCHAR(36),
        "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_mcp_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_mcp_sessions_diagram"
          FOREIGN KEY ("diagram_id") REFERENCES "diagrams"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_mcp_sessions_snapshot_version"
          FOREIGN KEY ("snapshot_version_id") REFERENCES "diagram_versions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_mcp_sessions_diagram_id"
        ON "mcp_sessions" ("diagram_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mcp_sessions_diagram_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mcp_sessions"`);
  }
}

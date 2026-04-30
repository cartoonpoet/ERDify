import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDiagramVersionsTable1746000000005 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "diagram_versions" (
        "id"         VARCHAR(36) NOT NULL,
        "diagram_id" VARCHAR(36) NOT NULL,
        "content"    JSONB       NOT NULL DEFAULT '{}',
        "revision"   INTEGER     NOT NULL,
        "created_by" VARCHAR(36) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_diagram_versions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_diagram_versions_diagram" FOREIGN KEY ("diagram_id")
          REFERENCES "diagrams"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "diagram_versions"`);
  }
}

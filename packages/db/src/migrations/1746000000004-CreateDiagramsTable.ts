import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDiagramsTable1746000000004 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "diagrams" (
        "id"         VARCHAR(36)  NOT NULL,
        "project_id" VARCHAR(36)  NOT NULL,
        "name"       VARCHAR(100) NOT NULL,
        "content"    JSONB        NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_diagrams" PRIMARY KEY ("id"),
        CONSTRAINT "fk_diagrams_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "diagrams"`);
  }
}

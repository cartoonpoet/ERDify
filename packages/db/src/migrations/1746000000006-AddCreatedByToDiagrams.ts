import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedByToDiagrams1746000000006 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "diagrams"
        ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(36)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "diagrams" DROP COLUMN IF EXISTS "created_by"`);
  }
}

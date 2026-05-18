import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAdminToUsers1746000000016 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "users" DROP COLUMN "is_admin"`);
  }
}

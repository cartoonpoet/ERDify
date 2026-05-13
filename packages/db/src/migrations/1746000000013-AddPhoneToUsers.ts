import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneToUsers1746000000013 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(30)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`);
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

export class IncreasePhoneColumnLength1746000000014 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "users" ALTER COLUMN "phone" TYPE VARCHAR(255)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "users" ALTER COLUMN "phone" TYPE VARCHAR(30)`);
  }
}

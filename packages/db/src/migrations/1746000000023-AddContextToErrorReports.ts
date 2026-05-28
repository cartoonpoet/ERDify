import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddContextToErrorReports1746000000023 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "error_reports" ADD COLUMN "page_name" VARCHAR(200)`);
    await runner.query(`ALTER TABLE "error_reports" ADD COLUMN "request_method" VARCHAR(10)`);
    await runner.query(`ALTER TABLE "error_reports" ADD COLUMN "request_body" TEXT`);
    await runner.query(`ALTER TABLE "error_reports" ADD COLUMN "request_params" TEXT`);
    await runner.query(`ALTER TABLE "error_reports" ADD COLUMN "response_body" TEXT`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "error_reports" DROP COLUMN "response_body"`);
    await runner.query(`ALTER TABLE "error_reports" DROP COLUMN "request_params"`);
    await runner.query(`ALTER TABLE "error_reports" DROP COLUMN "request_body"`);
    await runner.query(`ALTER TABLE "error_reports" DROP COLUMN "request_method"`);
    await runner.query(`ALTER TABLE "error_reports" DROP COLUMN "page_name"`);
  }
}

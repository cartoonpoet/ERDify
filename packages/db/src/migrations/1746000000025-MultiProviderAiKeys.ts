import type { MigrationInterface, QueryRunner } from "typeorm";

export class MultiProviderAiKeys1746000000025 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE organization_ai_settings ADD COLUMN IF NOT EXISTS provider_keys JSONB NOT NULL DEFAULT '{}'::jsonb`
    );
    await runner.query(
      `ALTER TABLE organization_ai_settings ADD COLUMN IF NOT EXISTS enabled_models JSONB NOT NULL DEFAULT '[]'::jsonb`
    );
    // 기존 단일 키(encrypted_api_key + provider)를 provider_keys 맵으로 이전
    await runner.query(
      `UPDATE organization_ai_settings
         SET provider_keys = jsonb_build_object(provider, encrypted_api_key)
       WHERE encrypted_api_key IS NOT NULL
         AND provider_keys = '{}'::jsonb`
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE organization_ai_settings DROP COLUMN IF EXISTS enabled_models`);
    await runner.query(`ALTER TABLE organization_ai_settings DROP COLUMN IF EXISTS provider_keys`);
  }
}

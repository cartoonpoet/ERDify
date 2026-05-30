import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("organization_ai_settings")
export class OrganizationAiSettings {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "organization_id", length: 36, unique: true })
  organizationId!: string;

  @Column({ name: "encrypted_api_key", type: "text", nullable: true })
  encryptedApiKey!: string | null;

  @Column({ type: "varchar", length: 20, default: "anthropic" })
  provider!: "anthropic" | "openai" | "gemini";

  @Column({ type: "varchar", length: 60, default: "" })
  model!: string;

  /** provider → 암호화된 API 키. 여러 provider 키를 동시에 보관. */
  @Column({ name: "provider_keys", type: "jsonb", default: () => "'{}'" })
  providerKeys!: Record<string, string>;

  /** 관리자가 허용한 모델 value 목록. 비어있으면 등록된 provider의 모든 모델 허용. */
  @Column({ name: "enabled_models", type: "jsonb", default: () => "'[]'" })
  enabledModels!: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

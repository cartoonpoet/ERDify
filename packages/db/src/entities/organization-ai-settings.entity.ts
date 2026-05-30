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

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

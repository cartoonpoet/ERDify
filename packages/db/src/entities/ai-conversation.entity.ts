import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("ai_conversations")
export class AiConversation {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @Column({ type: "varchar", name: "diagram_id", length: 36, nullable: true })
  diagramId!: string | null;

  @Column({ type: "varchar", length: 10 })
  role!: "user" | "assistant";

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "jsonb", nullable: true, name: "tool_calls" })
  toolCalls!: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  diff!: Record<string, unknown> | null;

  @Column({ type: "boolean", nullable: true })
  accepted!: boolean | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

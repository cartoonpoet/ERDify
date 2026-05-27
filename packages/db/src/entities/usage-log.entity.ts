import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("usage_logs")
export class UsageLog {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "organization_id", length: 36 })
  organizationId!: string;

  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @Column({ name: "event_type", length: 50 })
  eventType!: string;

  @Column({ type: "varchar", name: "resource_type", length: 30, nullable: true })
  resourceType!: string | null;

  @Column({ name: "resource_id", length: 36, nullable: true })
  resourceId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  meta!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}

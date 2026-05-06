import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { Diagram } from "./diagram.entity";

@Entity("mcp_sessions")
export class McpSession {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "diagram_id", length: 36 })
  diagramId!: string;

  @Column({ type: "jsonb", default: [] })
  tool_calls!: { tool: string; summary: string }[];

  @Column({ type: "varchar", length: 500, nullable: true })
  summary!: string | null;

  @Column({ name: "snapshot_version_id", length: 36, nullable: true })
  snapshotVersionId!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne("Diagram", "mcpSessions")
  @JoinColumn({ name: "diagram_id" })
  diagram!: Diagram;
}

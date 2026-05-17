import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export type ErrorType = "5xx" | "network" | "403" | "404";

@Entity("error_reports")
export class ErrorReport {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "error_type", type: "varchar", length: 10 })
  errorType!: ErrorType;

  @Column({ name: "http_status", type: "int", nullable: true })
  httpStatus!: number | null;

  @Column({ type: "varchar", length: 500 })
  path!: string;

  @Column({ type: "varchar", length: 2000 })
  url!: string;

  @Column({ name: "user_id", type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ name: "user_agent", type: "varchar", length: 500 })
  userAgent!: string;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: "resolved_by", type: "varchar", length: 36, nullable: true })
  resolvedBy!: string | null;

  @Column({ name: "resolved_note", type: "text", nullable: true })
  resolvedNote!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

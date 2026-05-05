import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("api_keys")
export class ApiKey {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 36 })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  // SHA-256 hex of the raw key — never store the raw key
  @Column({ name: "key_hash", length: 64, unique: true })
  keyHash!: string;

  // First 16 chars of the raw key for display (e.g. "erd_a1b2c3d4...")
  @Column({ length: 16 })
  prefix!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "revoked_at", nullable: true, type: "timestamptz" })
  revokedAt!: Date | null;
}

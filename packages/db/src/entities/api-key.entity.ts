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

  @Column({ name: "key_hash", length: 64, unique: true })
  keyHash!: string;

  @Column({ length: 16 })
  prefix!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  name!: string | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "revoked_at", nullable: true, type: "timestamptz" })
  revokedAt!: Date | null;
}

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { Organization } from "./organization.entity";
import type { User } from "./user.entity";
import type { MemberRole } from "./organization-member.entity";

@Entity("invites")
export class Invite {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "org_id", length: 36 })
  orgId!: string;

  @Column({ length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 20, default: "editor" })
  role!: MemberRole;

  @Column({ length: 36, unique: true })
  token!: string;

  @Column({ name: "invited_by_id", length: 36 })
  invitedById!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
  acceptedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne("Organization")
  @JoinColumn({ name: "org_id" })
  org!: Organization;

  @ManyToOne("User")
  @JoinColumn({ name: "invited_by_id" })
  invitedBy!: User;
}

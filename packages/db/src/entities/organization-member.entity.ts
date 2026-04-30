import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import type { Organization } from "./organization.entity";
import type { User } from "./user.entity";

export type MemberRole = "owner" | "editor" | "viewer";

@Entity("organization_members")
export class OrganizationMember {
  @PrimaryColumn("varchar", { length: 36, name: "organization_id" })
  organizationId!: string;

  @PrimaryColumn("varchar", { length: 36, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 20, default: "viewer" })
  role!: MemberRole;

  @CreateDateColumn({ name: "joined_at" })
  joinedAt!: Date;

  @ManyToOne("Organization", "members")
  organization!: Organization;

  @ManyToOne("User", "memberships")
  user!: User;
}

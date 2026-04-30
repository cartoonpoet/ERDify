import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";
import type { OrganizationMember } from "./organization-member.entity";
import type { Project } from "./project.entity";

@Entity("organizations")
export class Organization {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ name: "owner_id", length: 36 })
  ownerId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany("OrganizationMember", "organization")
  members!: OrganizationMember[];

  @OneToMany("Project", "organization")
  projects!: Project[];
}

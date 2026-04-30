import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";
import type { OrganizationMember } from "./organization-member.entity";

@Entity("users")
export class User {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: "password_hash", length: 255 })
  passwordHash!: string;

  @Column({ length: 100 })
  name!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany("OrganizationMember", "user")
  memberships!: OrganizationMember[];
}

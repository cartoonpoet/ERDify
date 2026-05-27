import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { AnnouncementType } from "@erdify/contracts";

@Entity("announcements")
export class Announcement {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 100 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 20 })
  type!: AnnouncementType;

  @Column({ name: "is_urgent", type: "boolean", default: false })
  isUrgent!: boolean;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt!: Date;

  @Column({ name: "ends_at", type: "timestamptz", nullable: true })
  endsAt!: Date | null;

  @Column({ name: "created_by", length: 36 })
  createdBy!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

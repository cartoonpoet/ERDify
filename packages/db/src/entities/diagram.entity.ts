import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import type { DiagramVersion } from "./diagram-version.entity";
import type { Project } from "./project.entity";

@Entity("diagrams")
export class Diagram {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "project_id", length: 36 })
  projectId!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: "jsonb" })
  content!: object;

  @Column({ type: "varchar", name: "created_by", length: 36, nullable: true })
  createdBy!: string | null;

  @Column({ type: "varchar", name: "share_token", length: 36, nullable: true, unique: true })
  shareToken!: string | null;

  @Column({ type: "timestamptz", name: "share_expires_at", nullable: true })
  shareExpiresAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne("Project", "diagrams")
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @OneToMany("DiagramVersion", "diagram")
  versions!: DiagramVersion[];
}

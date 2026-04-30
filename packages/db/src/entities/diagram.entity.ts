import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn
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

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne("Project", "diagrams")
  project!: Project;

  @OneToMany("DiagramVersion", "diagram")
  versions!: DiagramVersion[];
}

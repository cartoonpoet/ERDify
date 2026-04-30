import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { Diagram } from "./diagram.entity";

@Entity("diagram_versions")
export class DiagramVersion {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "diagram_id", length: 36 })
  diagramId!: string;

  @Column({ type: "jsonb" })
  content!: object;

  @Column({ type: "integer" })
  revision!: number;

  @Column({ name: "created_by", length: 36 })
  createdBy!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne("Diagram", "versions")
  @JoinColumn({ name: "diagram_id" })
  diagram!: Diagram;
}

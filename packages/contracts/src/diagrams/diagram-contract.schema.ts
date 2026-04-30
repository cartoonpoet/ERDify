import { z } from "zod";

export const diagramDialectSchema = z.enum(["postgresql", "mysql", "mariadb"]);

export const createDiagramRequestSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(120),
  dialect: diagramDialectSchema
});

export type DiagramDialectContract = z.infer<typeof diagramDialectSchema>;
export type CreateDiagramRequest = z.infer<typeof createDiagramRequestSchema>;

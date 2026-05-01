import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateDdl } from "@erdify/domain";
import type { DiagramDocument } from "@erdify/domain";
import { client } from "../client.js";

function formatDiagram(name: string, doc: DiagramDocument): string {
  const lines: string[] = [`Diagram: "${name}" (${doc.dialect})`, ""];
  lines.push(`Tables (${doc.entities.length}):`);
  for (const entity of doc.entities) {
    lines.push(`  ${entity.name}`);
    for (const col of [...entity.columns].sort((a, b) => a.ordinal - b.ordinal)) {
      const flags = [
        col.primaryKey ? "PK" : null,
        !col.nullable ? "NOT NULL" : null,
        col.unique ? "UNIQUE" : null,
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(`    - ${col.name}: ${col.type}${flags ? " " + flags : ""}`);
    }
  }
  if (doc.relationships.length > 0) {
    lines.push("", `Relationships (${doc.relationships.length}):`);
    for (const rel of doc.relationships) {
      const src = doc.entities.find((e) => e.id === rel.sourceEntityId)?.name ?? rel.sourceEntityId;
      const tgt = doc.entities.find((e) => e.id === rel.targetEntityId)?.name ?? rel.targetEntityId;
      lines.push(`  ${src} → ${tgt} (${rel.cardinality})`);
    }
  }
  return lines.join("\n");
}

export const registerReadTools = (server: McpServer): void => {
  server.tool(
    "list_organizations",
    "List all ERDify organizations accessible with the current API key",
    {},
    async () => {
      const orgs = await client.getOrganizations();
      const text =
        orgs.length === 0
          ? "No organizations found."
          : orgs.map((o) => `- ${o.name} (id: ${o.id})`).join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "list_projects",
    "List projects in an organization",
    { organizationId: z.string().describe("Organization ID from list_organizations") },
    async ({ organizationId }) => {
      const projects = await client.getProjects(organizationId);
      const text =
        projects.length === 0
          ? "No projects found."
          : projects.map((p) => `- ${p.name} (id: ${p.id})`).join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "list_diagrams",
    "List diagrams in a project",
    { projectId: z.string().describe("Project ID from list_projects") },
    async ({ projectId }) => {
      const diagrams = await client.getDiagrams(projectId);
      const text =
        diagrams.length === 0
          ? "No diagrams found."
          : diagrams
              .map((d) => `- ${d.name} (id: ${d.id}, updated: ${d.updatedAt})`)
              .join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_diagram",
    "Get a summary of tables, columns, and relationships in a diagram",
    { diagramId: z.string().describe("Diagram ID from list_diagrams") },
    async ({ diagramId }) => {
      const diagram = await client.getDiagram(diagramId);
      const text = formatDiagram(diagram.name, diagram.content);
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_ddl",
    "Generate DDL SQL for a diagram",
    { diagramId: z.string().describe("Diagram ID from list_diagrams") },
    async ({ diagramId }) => {
      const diagram = await client.getDiagram(diagramId);
      const ddl = generateDdl(diagram.content);
      const text = ddl.trim() || "-- No tables defined";
      return { content: [{ type: "text", text }] };
    }
  );
};

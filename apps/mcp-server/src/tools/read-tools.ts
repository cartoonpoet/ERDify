import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateDdl } from "@erdify/domain";
import type { DiagramDocument } from "@erdify/domain";
import { client } from "../client.js";

function formatDiagram(name: string, doc: DiagramDocument): string {
  const lines: string[] = [`Diagram: "${name}" (${doc.dialect})`, ""];
  lines.push(`Tables (${doc.entities.length}):`);
  for (const entity of doc.entities) {
    lines.push(`  ${entity.name} [tableId: ${entity.id}]`);
    for (const col of [...entity.columns].sort((a, b) => a.ordinal - b.ordinal)) {
      const flags = [
        col.primaryKey ? "PK" : null,
        !col.nullable ? "NOT NULL" : null,
        col.unique ? "UNIQUE" : null,
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(`    - ${col.name} [columnId: ${col.id}]: ${col.type}${flags ? " " + flags : ""}`);
    }
  }
  if (doc.relationships.length > 0) {
    lines.push("", `Relationships (${doc.relationships.length}):`);
    for (const rel of doc.relationships) {
      const src = doc.entities.find((e) => e.id === rel.sourceEntityId)?.name ?? rel.sourceEntityId;
      const tgt = doc.entities.find((e) => e.id === rel.targetEntityId)?.name ?? rel.targetEntityId;
      lines.push(`  ${src} → ${tgt} (${rel.cardinality}) [relationshipId: ${rel.id}]`);
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
      await client.recordToolCall(diagramId, "get_diagram", `"${diagram.name}" 다이어그램 조회`).catch(() => {});
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_table",
    "Get details of a specific table by name in a diagram. Use this instead of get_diagram when you only need one table.",
    {
      diagramId: z.string().describe("Diagram ID from list_diagrams"),
      tableName: z.string().describe("Table name to look up (case-insensitive)"),
    },
    async ({ diagramId, tableName }) => {
      const diagram = await client.getDiagram(diagramId);
      const entity = diagram.content.entities.find(
        (e) => e.name.toLowerCase() === tableName.toLowerCase()
      );
      if (!entity) {
        return {
          content: [{ type: "text", text: `Table "${tableName}" not found in diagram "${diagram.name}".` }],
        };
      }
      const lines: string[] = [`Table: ${entity.name} [tableId: ${entity.id}]`];
      for (const col of [...entity.columns].sort((a, b) => a.ordinal - b.ordinal)) {
        const flags = [
          col.primaryKey ? "PK" : null,
          !col.nullable ? "NOT NULL" : null,
          col.unique ? "UNIQUE" : null,
        ]
          .filter(Boolean)
          .join(" ");
        lines.push(`  - ${col.name} [columnId: ${col.id}]: ${col.type}${flags ? " " + flags : ""}`);
      }
      const related = diagram.content.relationships.filter(
        (r) => r.sourceEntityId === entity.id || r.targetEntityId === entity.id
      );
      if (related.length > 0) {
        lines.push("", `Relationships (${related.length}):`);
        for (const rel of related) {
          const src = diagram.content.entities.find((e) => e.id === rel.sourceEntityId)?.name ?? rel.sourceEntityId;
          const tgt = diagram.content.entities.find((e) => e.id === rel.targetEntityId)?.name ?? rel.targetEntityId;
          lines.push(`  ${src} → ${tgt} (${rel.cardinality}) [relationshipId: ${rel.id}]`);
        }
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
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
      await client.recordToolCall(diagramId, "get_ddl", `"${diagram.name}" DDL 생성`).catch(() => {});
      return { content: [{ type: "text", text }] };
    }
  );
};

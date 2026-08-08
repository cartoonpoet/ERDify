import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateDdlReport, formatDiagram, formatEntityLines, qualifiedEntityName } from "@erdify/domain";
import type { DiagramDocument, DiagramEntity } from "@erdify/domain";
import { client } from "../client.js";

const eq = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * 이름으로 테이블을 찾는다. 이름이 유일하다는 보장이 없으므로(스키마가 다르면 정상적으로 공존)
 * 일치하는 것을 **전부** 돌려준다.
 *
 * `"Schema.Table"` 표기도 받는다. 단, 이름 자체에 점이 든 테이블이 우선이다 —
 * 먼저 이름 전체로 맞춰보고, 없을 때만 마지막 점을 스키마 구분자로 해석한다.
 */
export function findEntitiesByName(
  entities: DiagramEntity[],
  tableName: string,
  schema?: string,
): DiagramEntity[] {
  const inSchema = (e: DiagramEntity): boolean => schema === undefined || eq(e.schema ?? "", schema);
  const exact = entities.filter((e) => eq(e.name, tableName) && inSchema(e));
  if (exact.length > 0 || schema !== undefined) return exact;

  const dot = tableName.lastIndexOf(".");
  if (dot <= 0) return [];
  const [qualifier, bare] = [tableName.slice(0, dot), tableName.slice(dot + 1)];
  return entities.filter((e) => eq(e.name, bare) && eq(e.schema ?? "", qualifier));
}

/** 테이블에 걸린 관계를 요약 줄로 만든다 (없으면 빈 배열). */
function relationshipLines(doc: DiagramDocument, entity: DiagramEntity): string[] {
  const related = doc.relationships.filter(
    (r) => r.sourceEntityId === entity.id || r.targetEntityId === entity.id
  );
  if (related.length === 0) return [];
  const nameById = new Map(doc.entities.map((e) => [e.id, qualifiedEntityName(e)]));
  const lines = ["", `Relationships (${related.length}):`];
  for (const rel of related) {
    const src = nameById.get(rel.sourceEntityId) ?? rel.sourceEntityId;
    const tgt = nameById.get(rel.targetEntityId) ?? rel.targetEntityId;
    lines.push(`  ${src} → ${tgt} (${rel.cardinality}) [relationshipId: ${rel.id}]`);
  }
  return lines;
}

export const registerReadTools = (server: McpServer): void => {
  server.registerTool(
    "list_organizations",
    {
      description: "List all ERDify organizations accessible with the current API key",
      inputSchema: {},
    },
    async () => {
      const orgs = await client.getOrganizations();
      const text =
        orgs.length === 0
          ? "No organizations found."
          : orgs.map((o) => `- ${o.name} (id: ${o.id})`).join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "list_projects",
    {
      description: "List projects in an organization",
      inputSchema: { organizationId: z.string().describe("Organization ID from list_organizations") },
    },
    async ({ organizationId }) => {
      const projects = await client.getProjects(organizationId);
      const text =
        projects.length === 0
          ? "No projects found."
          : projects.map((p) => `- ${p.name} (id: ${p.id})`).join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "list_diagrams",
    {
      description: "List diagrams in a project",
      inputSchema: { projectId: z.string().describe("Project ID from list_projects") },
    },
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

  server.registerTool(
    "get_diagram",
    {
      description:
        "Get a summary of tables, columns, and relationships in a diagram. Table names are schema-qualified when a schema is set. Pass detail=true to also get column defaults, comments, ON UPDATE clauses and indexes.",
      inputSchema: {
        diagramId: z.string().describe("Diagram ID from list_diagrams"),
        detail: z
          .boolean()
          .optional()
          .describe(
            "Include column DEFAULT / ON UPDATE / AUTO_INCREMENT / comments and each table's indexes. Defaults to false because it is much longer on large diagrams."
          ),
      },
    },
    async ({ diagramId, detail }) => {
      const diagram = await client.getDiagram(diagramId);
      const text = formatDiagram(diagram.name, diagram.content, { detail: detail ?? false });
      void client.recordToolCall(diagramId, "get_diagram", `"${diagram.name}" 다이어그램 조회`).catch(() => {});
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "get_table",
    {
      description:
        "Get full details of a table by name — columns with types, defaults, ON UPDATE, comments, plus its indexes and relationships. Use this instead of get_ddl when you only need to inspect or verify one table. Every table with a matching name is returned, so tables sharing a name across schemas are all visible.",
      inputSchema: {
        diagramId: z.string().describe("Diagram ID from list_diagrams"),
        tableName: z
          .string()
          .describe('Table name to look up (case-insensitive). "Schema.Table" is also accepted.'),
        schema: z
          .string()
          .optional()
          .describe("Restrict the lookup to this schema (case-insensitive). Useful when the name exists in several schemas."),
      },
    },
    async ({ diagramId, tableName, schema }) => {
      const diagram = await client.getDiagram(diagramId);
      const matches = findEntitiesByName(diagram.content.entities, tableName, schema);
      if (matches.length === 0) {
        const where = schema ? ` in schema "${schema}"` : "";
        return {
          content: [{ type: "text", text: `Table "${tableName}"${where} not found in diagram "${diagram.name}".` }],
        };
      }

      const lines: string[] = [];
      // 같은 이름이 여러 스키마에 공존할 수 있다. 첫 번째만 돌려주면 나머지를 못 찾으므로 전부 나열한다.
      if (matches.length > 1) {
        lines.push(`${matches.length} tables named "${tableName}" (different schemas or duplicates):`, "");
      }
      for (const [i, entity] of matches.entries()) {
        if (i > 0) lines.push("");
        const [header, ...rest] = formatEntityLines(diagram.content, entity, { detail: true });
        lines.push(`Table: ${header}`, ...rest, ...relationshipLines(diagram.content, entity));
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.registerTool(
    "get_ddl",
    {
      description: "Generate DDL SQL for a diagram",
      inputSchema: { diagramId: z.string().describe("Diagram ID from list_diagrams") },
    },
    async ({ diagramId }) => {
      const diagram = await client.getDiagram(diagramId);
      const { sql, warnings } = generateDdlReport(diagram.content);
      const ddl = sql.trim() || "-- No tables defined";
      // 강등된 항목(실행 불가 SQL 방지)이 있으면 DDL 상단에 경고 배너로 노출한다
      const banner =
        warnings.length > 0
          ? `-- ⚠ erdify export 경고 ${warnings.length}건 (해당 항목은 주석으로 강등됨):\n` +
            warnings.map((w) => `--   [${w.code}] ${w.message}`).join("\n") +
            "\n\n"
          : "";
      void client.recordToolCall(diagramId, "get_ddl", `"${diagram.name}" DDL 생성`).catch(() => {});
      return { content: [{ type: "text", text: banner + ddl }] };
    }
  );
};

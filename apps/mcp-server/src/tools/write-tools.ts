import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addEntity,
  removeEntity,
  addColumn,
  updateColumn,
  removeColumn,
  addRelationship,
  removeRelationship,
} from "@erdify/domain";
import type { DiagramColumn, DiagramRelationship, RelationshipCardinality } from "@erdify/domain";
import { client } from "../client.js";

const columnInputSchema = z.object({
  name: z.string().describe("Column name"),
  type: z.string().describe("SQL type, e.g. varchar, uuid, integer, timestamp"),
  nullable: z.boolean().optional().describe("Defaults to true"),
  primaryKey: z.boolean().optional().describe("Defaults to false"),
  unique: z.boolean().optional().describe("Defaults to false"),
  defaultValue: z
    .string()
    .nullable()
    .optional()
    .describe("SQL default expression, set to null to remove"),
  comment: z.string().nullable().optional().describe("Optional column comment"),
});

type ColumnInput = z.infer<typeof columnInputSchema>;

function buildColumn(input: ColumnInput, ordinal: number): DiagramColumn {
  return {
    id: randomUUID(),
    name: input.name,
    type: input.type,
    nullable: input.nullable ?? true,
    primaryKey: input.primaryKey ?? false,
    unique: input.unique ?? false,
    defaultValue: input.defaultValue ?? null,
    comment: null,
    ordinal,
  };
}

export const registerWriteTools = (server: McpServer): void => {
  server.tool(
    "add_table",
    "Add a new table to a diagram. Returns the new table's ID — save it to use in add_column and other calls.",
    {
      diagramId: z.string(),
      name: z.string().describe("Table name"),
      columns: z.array(columnInputSchema).optional().describe("Initial columns"),
    },
    async ({ diagramId, name, columns }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entityId = randomUUID();
      let updated = addEntity(doc, { id: entityId, name });
      const columnIds: string[] = [];
      if (columns) {
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i]!;
          const built = buildColumn(col, i);
          columnIds.push(built.id);
          updated = addColumn(updated, entityId, built);
        }
      }
      await client.updateDiagram(diagramId, updated);
      await client.recordToolCall(diagramId, "add_table", `"${name}" 테이블 추가`).catch(() => {});
      const colInfo =
        columnIds.length > 0 ? ` Columns: ${columnIds.join(", ")}` : "";
      return {
        content: [
          {
            type: "text",
            text: `Table "${name}" added. tableId=${entityId}.${colInfo}`,
          },
        ],
      };
    }
  );

  server.tool(
    "remove_table",
    "Remove a table from a diagram by its ID",
    {
      diagramId: z.string(),
      tableId: z.string().describe("ID of the table to remove (from get_diagram)"),
    },
    async ({ diagramId, tableId }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) {
        throw new Error(`Table ID "${tableId}" not found in diagram`);
      }
      const updated = removeEntity(doc, tableId);
      await client.updateDiagram(diagramId, updated);
      await client.recordToolCall(diagramId, "remove_table", `"${entity.name}" 테이블 삭제`).catch(() => {});
      return { content: [{ type: "text", text: `Table "${entity.name}" (${tableId}) removed.` }] };
    }
  );

  server.tool(
    "add_column",
    "Add a column to an existing table. Returns the new column's ID.",
    {
      diagramId: z.string(),
      tableId: z.string().describe("ID of the table (from get_diagram or add_table)"),
      column: columnInputSchema,
    },
    async ({ diagramId, tableId, column }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new Error(`Table ID "${tableId}" not found in diagram`);
      const built = buildColumn(column, entity.columns.length);
      const updated = addColumn(doc, tableId, built);
      await client.updateDiagram(diagramId, updated);
      await client.recordToolCall(diagramId, "add_column", `"${entity.name}.${column.name}" 컬럼 추가`).catch(() => {});
      return {
        content: [
          {
            type: "text",
            text: `Column "${column.name}" added to table ${tableId}. columnId=${built.id}.`,
          },
        ],
      };
    }
  );

  server.tool(
    "update_column",
    "Update properties of an existing column",
    {
      diagramId: z.string(),
      tableId: z.string().describe("ID of the table (from get_diagram)"),
      columnId: z.string().describe("ID of the column (from get_diagram)"),
      updates: columnInputSchema.partial(),
    },
    async ({ diagramId, tableId, columnId, updates }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new Error(`Table ID "${tableId}" not found`);
      const col = entity.columns.find((c) => c.id === columnId);
      if (!col) throw new Error(`Column ID "${columnId}" not found in table ${tableId}`);
      const changes: Partial<Omit<DiagramColumn, "id">> = {};
      if (updates.name !== undefined) changes.name = updates.name;
      if (updates.type !== undefined) changes.type = updates.type;
      if (updates.nullable !== undefined) changes.nullable = updates.nullable;
      if (updates.primaryKey !== undefined) changes.primaryKey = updates.primaryKey;
      if (updates.unique !== undefined) changes.unique = updates.unique;
      if (updates.defaultValue !== undefined) changes.defaultValue = updates.defaultValue;
      if (updates.comment !== undefined) changes.comment = updates.comment;
      const updated = updateColumn(doc, tableId, columnId, changes);
      await client.updateDiagram(diagramId, updated);
      await client.recordToolCall(diagramId, "update_column", `"${entity.name}.${col.name}" 컬럼 수정`).catch(() => {});
      return { content: [{ type: "text", text: `Column ${columnId} updated.` }] };
    }
  );

  server.tool(
    "remove_column",
    "Remove a column from a table",
    {
      diagramId: z.string(),
      tableId: z.string().describe("ID of the table (from get_diagram)"),
      columnId: z.string().describe("ID of the column (from get_diagram)"),
    },
    async ({ diagramId, tableId, columnId }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new Error(`Table ID "${tableId}" not found`);
      if (!entity.columns.find((c) => c.id === columnId)) {
        throw new Error(`Column ID "${columnId}" not found in table ${tableId}`);
      }
      const colToRemove = entity.columns.find((c) => c.id === columnId)!;
      const updated = removeColumn(doc, tableId, columnId);
      await client.updateDiagram(diagramId, updated);
      await client.recordToolCall(diagramId, "remove_column", `"${entity.name}.${colToRemove.name}" 컬럼 삭제`).catch(() => {});
      return { content: [{ type: "text", text: `Column "${colToRemove.name}" (${columnId}) removed from table "${entity.name}".` }] };
    }
  );

  server.tool(
    "add_relationship",
    "Add a foreign key relationship between two tables. Returns the new relationship ID.",
    {
      diagramId: z.string(),
      sourceTableId: z
        .string()
        .describe("ID of the table that holds the foreign key (from get_diagram)"),
      targetTableId: z
        .string()
        .describe("ID of the table being referenced (from get_diagram)"),
      cardinality: z
        .enum(["one-to-one", "one-to-many", "many-to-one"])
        .describe("Relationship cardinality"),
    },
    async ({ diagramId, sourceTableId, targetTableId, cardinality }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      if (!doc.entities.find((e) => e.id === sourceTableId)) {
        throw new Error(`Source table ID "${sourceTableId}" not found`);
      }
      if (!doc.entities.find((e) => e.id === targetTableId)) {
        throw new Error(`Target table ID "${targetTableId}" not found`);
      }
      const relationship: DiagramRelationship = {
        id: randomUUID(),
        name: "",
        sourceEntityId: sourceTableId,
        sourceColumnIds: [],
        targetEntityId: targetTableId,
        targetColumnIds: [],
        cardinality: cardinality as RelationshipCardinality,
        onDelete: "no-action",
        onUpdate: "no-action",
        identifying: false,
      };
      const updated = addRelationship(doc, relationship);
      await client.updateDiagram(diagramId, updated);
      const srcName = doc.entities.find((e) => e.id === sourceTableId)?.name ?? sourceTableId;
      const tgtName = doc.entities.find((e) => e.id === targetTableId)?.name ?? targetTableId;
      await client.recordToolCall(diagramId, "add_relationship", `"${srcName}" → "${tgtName}" 관계 추가`).catch(() => {});
      return {
        content: [
          {
            type: "text",
            text: `Relationship added: ${sourceTableId} → ${targetTableId} (${cardinality}). relationshipId=${relationship.id}.`,
          },
        ],
      };
    }
  );

  server.tool(
    "remove_relationship",
    "Remove a relationship by its ID",
    {
      diagramId: z.string(),
      relationshipId: z
        .string()
        .describe("ID of the relationship to remove (from get_diagram)"),
    },
    async ({ diagramId, relationshipId }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const rel = doc.relationships.find((r) => r.id === relationshipId);
      if (!rel) {
        throw new Error(`Relationship ID "${relationshipId}" not found`);
      }
      const srcName = doc.entities.find((e) => e.id === rel.sourceEntityId)?.name ?? rel.sourceEntityId;
      const tgtName = doc.entities.find((e) => e.id === rel.targetEntityId)?.name ?? rel.targetEntityId;
      const updated = removeRelationship(doc, relationshipId);
      await client.updateDiagram(diagramId, updated);
      await client.recordToolCall(diagramId, "remove_relationship", `"${srcName}" → "${tgtName}" 관계 삭제`).catch(() => {});
      return {
        content: [{ type: "text", text: `Relationship "${srcName} → ${tgtName}" (${relationshipId}) removed.` }],
      };
    }
  );
};

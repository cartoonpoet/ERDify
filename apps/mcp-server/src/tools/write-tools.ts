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
  defaultValue: z.string().optional().describe("SQL default expression"),
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
    "Add a new table to a diagram",
    {
      diagramId: z.string(),
      name: z.string().describe("Table name"),
      columns: z.array(columnInputSchema).optional().describe("Initial columns"),
    },
    async ({ diagramId, name, columns }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entityId = randomUUID();
      let updated = addEntity(doc, { id: entityId, name });
      if (columns) {
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i]!;
          updated = addColumn(updated, entityId, buildColumn(col, i));
        }
      }
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Table "${name}" added.` }] };
    }
  );

  server.tool(
    "remove_table",
    "Remove a table from a diagram by name",
    {
      diagramId: z.string(),
      tableName: z.string().describe("Exact table name"),
    },
    async ({ diagramId, tableName }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.name === tableName);
      if (!entity) throw new Error(`Table "${tableName}" not found in diagram`);
      const updated = removeEntity(doc, entity.id);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Table "${tableName}" removed.` }] };
    }
  );

  server.tool(
    "add_column",
    "Add a column to an existing table",
    {
      diagramId: z.string(),
      tableName: z.string(),
      column: columnInputSchema,
    },
    async ({ diagramId, tableName, column }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.name === tableName);
      if (!entity) throw new Error(`Table "${tableName}" not found in diagram`);
      const ordinal = entity.columns.length;
      const updated = addColumn(doc, entity.id, buildColumn(column, ordinal));
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Column "${column.name}" added to "${tableName}".` }] };
    }
  );

  server.tool(
    "update_column",
    "Update properties of an existing column",
    {
      diagramId: z.string(),
      tableName: z.string(),
      columnName: z.string(),
      updates: columnInputSchema.partial(),
    },
    async ({ diagramId, tableName, columnName, updates }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.name === tableName);
      if (!entity) throw new Error(`Table "${tableName}" not found`);
      const col = entity.columns.find((c) => c.name === columnName);
      if (!col) throw new Error(`Column "${columnName}" not found in "${tableName}"`);
      const changes: Partial<Omit<DiagramColumn, "id">> = {};
      if (updates.name !== undefined) changes.name = updates.name;
      if (updates.type !== undefined) changes.type = updates.type;
      if (updates.nullable !== undefined) changes.nullable = updates.nullable;
      if (updates.primaryKey !== undefined) changes.primaryKey = updates.primaryKey;
      if (updates.unique !== undefined) changes.unique = updates.unique;
      if (updates.defaultValue !== undefined) changes.defaultValue = updates.defaultValue;
      const updated = updateColumn(doc, entity.id, col.id, changes);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Column "${columnName}" updated.` }] };
    }
  );

  server.tool(
    "remove_column",
    "Remove a column from a table",
    {
      diagramId: z.string(),
      tableName: z.string(),
      columnName: z.string(),
    },
    async ({ diagramId, tableName, columnName }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.name === tableName);
      if (!entity) throw new Error(`Table "${tableName}" not found`);
      const col = entity.columns.find((c) => c.name === columnName);
      if (!col) throw new Error(`Column "${columnName}" not found in "${tableName}"`);
      const updated = removeColumn(doc, entity.id, col.id);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Column "${columnName}" removed from "${tableName}".` }] };
    }
  );

  server.tool(
    "add_relationship",
    "Add a foreign key relationship between two tables",
    {
      diagramId: z.string(),
      sourceTable: z.string().describe("Table that holds the foreign key"),
      targetTable: z.string().describe("Table being referenced"),
      cardinality: z
        .enum(["one-to-one", "one-to-many", "many-to-one"])
        .describe("Relationship cardinality"),
    },
    async ({ diagramId, sourceTable, targetTable, cardinality }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const sourceEntity = doc.entities.find((e) => e.name === sourceTable);
      const targetEntity = doc.entities.find((e) => e.name === targetTable);
      if (!sourceEntity) throw new Error(`Table "${sourceTable}" not found`);
      if (!targetEntity) throw new Error(`Table "${targetTable}" not found`);
      const relationship: DiagramRelationship = {
        id: randomUUID(),
        name: "",
        sourceEntityId: sourceEntity.id,
        sourceColumnIds: [],
        targetEntityId: targetEntity.id,
        targetColumnIds: [],
        cardinality: cardinality as RelationshipCardinality,
        onDelete: "no-action",
        onUpdate: "no-action",
      };
      const updated = addRelationship(doc, relationship);
      await client.updateDiagram(diagramId, updated);
      return {
        content: [
          { type: "text", text: `Relationship ${sourceTable} → ${targetTable} (${cardinality}) added.` },
        ],
      };
    }
  );

  server.tool(
    "remove_relationship",
    "Remove a relationship between two tables (removes first match if multiple exist)",
    {
      diagramId: z.string(),
      sourceTable: z.string(),
      targetTable: z.string(),
    },
    async ({ diagramId, sourceTable, targetTable }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const sourceEntity = doc.entities.find((e) => e.name === sourceTable);
      const targetEntity = doc.entities.find((e) => e.name === targetTable);
      if (!sourceEntity) throw new Error(`Table "${sourceTable}" not found`);
      if (!targetEntity) throw new Error(`Table "${targetTable}" not found`);
      const rel = doc.relationships.find(
        (r) => r.sourceEntityId === sourceEntity.id && r.targetEntityId === targetEntity.id
      );
      if (!rel)
        throw new Error(`No relationship found from "${sourceTable}" to "${targetTable}"`);
      const updated = removeRelationship(doc, rel.id);
      await client.updateDiagram(diagramId, updated);
      return {
        content: [{ type: "text", text: `Relationship ${sourceTable} → ${targetTable} removed.` }],
      };
    }
  );
};

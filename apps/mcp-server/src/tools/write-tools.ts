import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addEntity,
  removeEntity,
  addColumn,
  addColumns,
  updateColumn,
  removeColumn,
  addRelationship,
  removeRelationship,
  updateRelationship,
} from "@erdify/domain";
import type {
  DiagramColumn,
  DiagramEntity,
  DiagramRelationship,
  ReferentialAction,
  RelationshipCardinality,
} from "@erdify/domain";
import { client } from "../client.js";

const referentialActionSchema = z.enum(["cascade", "restrict", "set-null", "no-action"]);
const cardinalitySchema = z.enum(["one-to-one", "one-to-many", "many-to-one"]);

/** 관계 컬럼 매핑에 쓰인 컬럼 id가 해당 테이블에 실제로 존재하는지 검증 (빈괄호/미해결 FK 예방) */
export function assertColumnsExist(entity: DiagramEntity, columnIds: string[], side: string): void {
  const known = new Set(entity.columns.map((c) => c.id));
  const missing = columnIds.filter((id) => !known.has(id));
  if (missing.length > 0) {
    throw new Error(`${side} table "${entity.name}" has no column(s): ${missing.join(", ")}`);
  }
}

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
  comment: z
    .string()
    .nullable()
    .optional()
    .describe("Optional logical name / column comment (논리명)"),
  autoIncrement: z
    .boolean()
    .optional()
    .describe("MySQL/MariaDB AUTO_INCREMENT. Defaults to false. The column should be a key (usually PK)."),
});

type ColumnInput = z.infer<typeof columnInputSchema>;

export function buildColumn(input: ColumnInput, ordinal: number): DiagramColumn {
  return {
    id: randomUUID(),
    name: input.name,
    type: input.type,
    nullable: input.nullable ?? true,
    primaryKey: input.primaryKey ?? false,
    unique: input.unique ?? false,
    defaultValue: input.defaultValue ?? null,
    comment: input.comment ?? null,
    autoIncrement: input.autoIncrement ?? false,
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
      // 컬럼을 한 번에 만들어 단일 불변 갱신으로 추가 (addColumn N회 호출의 O(N^2) 복제 방지)
      const built = (columns ?? []).map((col, i) => buildColumn(col, i));
      const columnIds = built.map((c) => c.id);
      const updated = addColumns(addEntity(doc, { id: entityId, name }), entityId, built);
      await client.updateDiagram(diagramId, updated);
      void client.recordToolCall(diagramId, "add_table", `"${name}" 테이블 추가`).catch(() => {});
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
      void client.recordToolCall(diagramId, "remove_table", `"${entity.name}" 테이블 삭제`).catch(() => {});
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
      void client.recordToolCall(diagramId, "add_column", `"${entity.name}.${column.name}" 컬럼 추가`).catch(() => {});
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
      void client.recordToolCall(diagramId, "update_column", `"${entity.name}.${col.name}" 컬럼 수정`).catch(() => {});
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
      const colToRemove = entity.columns.find((c) => c.id === columnId);
      if (!colToRemove) {
        throw new Error(`Column ID "${columnId}" not found in table ${tableId}`);
      }
      const updated = removeColumn(doc, tableId, columnId);
      await client.updateDiagram(diagramId, updated);
      void client.recordToolCall(diagramId, "remove_column", `"${entity.name}.${colToRemove.name}" 컬럼 삭제`).catch(() => {});
      return { content: [{ type: "text", text: `Column "${colToRemove.name}" (${columnId}) removed from table "${entity.name}".` }] };
    }
  );

  server.tool(
    "add_relationship",
    "Add a foreign key relationship between two tables. Provide sourceColumnIds/targetColumnIds so the FK columns are known — otherwise the DDL export downgrades the FK to a comment. Returns the new relationship ID.",
    {
      diagramId: z.string(),
      sourceTableId: z
        .string()
        .describe("ID of the table that holds the foreign key (from get_diagram)"),
      targetTableId: z
        .string()
        .describe("ID of the table being referenced (from get_diagram)"),
      cardinality: cardinalitySchema.describe("Relationship cardinality"),
      sourceColumnIds: z
        .array(z.string())
        .optional()
        .describe("FK column IDs on the source table, ordered to match targetColumnIds"),
      targetColumnIds: z
        .array(z.string())
        .optional()
        .describe("Referenced column IDs on the target table (usually its PK), same order/length as sourceColumnIds"),
      name: z.string().optional().describe("Optional constraint name"),
      onDelete: referentialActionSchema.optional().describe("Defaults to no-action"),
      onUpdate: referentialActionSchema.optional().describe("Defaults to no-action"),
      identifying: z.boolean().optional().describe("Defaults to false"),
    },
    async ({
      diagramId,
      sourceTableId,
      targetTableId,
      cardinality,
      sourceColumnIds,
      targetColumnIds,
      name,
      onDelete,
      onUpdate,
      identifying,
    }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entityById = new Map(doc.entities.map((e) => [e.id, e]));
      const srcEntity = entityById.get(sourceTableId);
      const tgtEntity = entityById.get(targetTableId);
      if (!srcEntity) throw new Error(`Source table ID "${sourceTableId}" not found`);
      if (!tgtEntity) throw new Error(`Target table ID "${targetTableId}" not found`);

      const srcCols = sourceColumnIds ?? [];
      const tgtCols = targetColumnIds ?? [];
      assertColumnsExist(srcEntity, srcCols, "Source");
      assertColumnsExist(tgtEntity, tgtCols, "Target");
      if (srcCols.length !== tgtCols.length) {
        throw new Error(
          `sourceColumnIds (${srcCols.length}) and targetColumnIds (${tgtCols.length}) must have the same length`
        );
      }

      const relationship: DiagramRelationship = {
        id: randomUUID(),
        name: name ?? "",
        sourceEntityId: sourceTableId,
        sourceColumnIds: srcCols,
        targetEntityId: targetTableId,
        targetColumnIds: tgtCols,
        cardinality: cardinality as RelationshipCardinality,
        onDelete: (onDelete ?? "no-action") as ReferentialAction,
        onUpdate: (onUpdate ?? "no-action") as ReferentialAction,
        identifying: identifying ?? false,
      };
      const updated = addRelationship(doc, relationship);
      await client.updateDiagram(diagramId, updated);
      void client.recordToolCall(diagramId, "add_relationship", `"${srcEntity.name}" → "${tgtEntity.name}" 관계 추가`).catch(() => {});
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
    "update_relationship",
    "Update an existing relationship — set the FK column mapping (sourceColumnIds/targetColumnIds) or its attributes. Only provided fields change.",
    {
      diagramId: z.string(),
      relationshipId: z.string().describe("ID of the relationship (from get_diagram)"),
      sourceColumnIds: z
        .array(z.string())
        .optional()
        .describe("FK column IDs on the source table, ordered to match targetColumnIds"),
      targetColumnIds: z
        .array(z.string())
        .optional()
        .describe("Referenced column IDs on the target table, same order/length as sourceColumnIds"),
      cardinality: cardinalitySchema.optional(),
      name: z.string().optional().describe("Constraint name"),
      onDelete: referentialActionSchema.optional(),
      onUpdate: referentialActionSchema.optional(),
      identifying: z.boolean().optional(),
    },
    async ({
      diagramId,
      relationshipId,
      sourceColumnIds,
      targetColumnIds,
      cardinality,
      name,
      onDelete,
      onUpdate,
      identifying,
    }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const rel = doc.relationships.find((r) => r.id === relationshipId);
      if (!rel) throw new Error(`Relationship ID "${relationshipId}" not found`);
      const entityById = new Map(doc.entities.map((e) => [e.id, e]));
      const srcEntity = entityById.get(rel.sourceEntityId);
      const tgtEntity = entityById.get(rel.targetEntityId);

      // 컬럼 매핑을 바꾸면 존재/개수 검증. 부분 업데이트 시에도 최종 두 배열의 길이가 맞아야 한다.
      if (sourceColumnIds !== undefined && srcEntity) assertColumnsExist(srcEntity, sourceColumnIds, "Source");
      if (targetColumnIds !== undefined && tgtEntity) assertColumnsExist(tgtEntity, targetColumnIds, "Target");
      const nextSrc = sourceColumnIds ?? rel.sourceColumnIds;
      const nextTgt = targetColumnIds ?? rel.targetColumnIds;
      if (nextSrc.length !== nextTgt.length) {
        throw new Error(
          `sourceColumnIds (${nextSrc.length}) and targetColumnIds (${nextTgt.length}) must have the same length`
        );
      }

      const patch: Partial<Omit<DiagramRelationship, "id">> = {};
      if (sourceColumnIds !== undefined) patch.sourceColumnIds = sourceColumnIds;
      if (targetColumnIds !== undefined) patch.targetColumnIds = targetColumnIds;
      if (cardinality !== undefined) patch.cardinality = cardinality as RelationshipCardinality;
      if (name !== undefined) patch.name = name;
      if (onDelete !== undefined) patch.onDelete = onDelete as ReferentialAction;
      if (onUpdate !== undefined) patch.onUpdate = onUpdate as ReferentialAction;
      if (identifying !== undefined) patch.identifying = identifying;

      const updated = updateRelationship(doc, relationshipId, patch);
      await client.updateDiagram(diagramId, updated);
      const srcName = srcEntity?.name ?? rel.sourceEntityId;
      const tgtName = tgtEntity?.name ?? rel.targetEntityId;
      void client.recordToolCall(diagramId, "update_relationship", `"${srcName}" → "${tgtName}" 관계 수정`).catch(() => {});
      return {
        content: [{ type: "text", text: `Relationship "${srcName} → ${tgtName}" (${relationshipId}) updated.` }],
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
      const nameById = new Map(doc.entities.map((e) => [e.id, e.name]));
      const srcName = nameById.get(rel.sourceEntityId) ?? rel.sourceEntityId;
      const tgtName = nameById.get(rel.targetEntityId) ?? rel.targetEntityId;
      const updated = removeRelationship(doc, relationshipId);
      await client.updateDiagram(diagramId, updated);
      void client.recordToolCall(diagramId, "remove_relationship", `"${srcName}" → "${tgtName}" 관계 삭제`).catch(() => {});
      return {
        content: [{ type: "text", text: `Relationship "${srcName} → ${tgtName}" (${relationshipId}) removed.` }],
      };
    }
  );
};

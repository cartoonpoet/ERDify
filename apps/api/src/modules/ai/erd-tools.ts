import type { Tool } from "@anthropic-ai/sdk/resources";

export const ERD_TOOLS: Tool[] = [
  {
    name: "addTable",
    description:
      "Add a new table to the ERD diagram. Use this when the user wants to create a new database table.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Table name (snake_case recommended)" },
        columns: {
          type: "array",
          description: "Initial columns to add (optional)",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: {
                type: "string",
                description: "SQL type e.g. uuid, varchar, integer, timestamptz, boolean",
              },
              nullable: { type: "boolean" },
              primaryKey: { type: "boolean" },
              unique: { type: "boolean" },
            },
            required: ["name", "type"],
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "removeTable",
    description: "Remove an existing table from the ERD diagram by its ID.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table to remove" },
      },
      required: ["tableId"],
    },
  },
  {
    name: "updateTable",
    description: "Rename an existing table.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table" },
        name: { type: "string", description: "New table name" },
      },
      required: ["tableId", "name"],
    },
  },
  {
    name: "addColumn",
    description: "Add a column to an existing table.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table" },
        name: { type: "string", description: "Column name" },
        type: {
          type: "string",
          description:
            "SQL type e.g. uuid, varchar, integer, timestamptz, boolean, jsonb",
        },
        nullable: { type: "boolean" },
        primaryKey: { type: "boolean" },
        unique: { type: "boolean" },
        defaultValue: { type: "string", description: "SQL default expression (optional)" },
      },
      required: ["tableId", "name", "type"],
    },
  },
  {
    name: "removeColumn",
    description: "Remove a column from a table.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table" },
        columnId: { type: "string", description: "ID of the column" },
      },
      required: ["tableId", "columnId"],
    },
  },
  {
    name: "updateColumn",
    description:
      "Update properties of an existing column (name, type, nullable, pk, etc.).",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string" },
        columnId: { type: "string" },
        name: { type: "string" },
        type: { type: "string" },
        nullable: { type: "boolean" },
        primaryKey: { type: "boolean" },
        unique: { type: "boolean" },
        defaultValue: { type: "string" },
      },
      required: ["tableId", "columnId"],
    },
  },
  {
    name: "addRelation",
    description: "Add a foreign key relationship between two tables. Automatically creates the FK column on the source table.",
    input_schema: {
      type: "object",
      properties: {
        sourceTableId: {
          type: "string",
          description: "Table that holds the foreign key (the 'many' side)",
        },
        targetTableId: { type: "string", description: "Table being referenced (the 'one' side)" },
        cardinality: {
          type: "string",
          enum: ["one-to-one", "one-to-many", "many-to-one"],
        },
        fkColumnName: {
          type: "string",
          description: "Name of the FK column to create on the source table (e.g. 'user_id'). ALWAYS provide this.",
        },
        fkNullable: {
          type: "boolean",
          description: "Whether the FK column is nullable. Defaults to false (required relationship).",
        },
      },
      required: ["sourceTableId", "targetTableId", "cardinality", "fkColumnName"],
    },
  },
  {
    name: "removeRelation",
    description: "Remove a relationship by its ID.",
    input_schema: {
      type: "object",
      properties: {
        relationId: { type: "string", description: "ID of the relationship to remove" },
      },
      required: ["relationId"],
    },
  },
  {
    name: "addIndex",
    description: "Add an index on one or more columns of a table. Use for FK columns and frequently queried columns.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table" },
        columnIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of the columns to include in the index",
        },
        name: { type: "string", description: "Index name (e.g. 'idx_orders_user_id')" },
        unique: { type: "boolean", description: "Whether this is a unique index. Defaults to false." },
      },
      required: ["tableId", "columnIds", "name"],
    },
  },
];

export const ERD_TOOLS_OPENAI = ERD_TOOLS.map((tool) => ({
  type: "function" as const,
  function: {
    name: tool.name,
    description: tool.description ?? "",
    parameters: tool.input_schema as Record<string, unknown>,
  },
}));

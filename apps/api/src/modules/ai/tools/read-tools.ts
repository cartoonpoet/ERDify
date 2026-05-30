import type { Tool } from "@anthropic-ai/sdk/resources";

export const READ_TOOLS: Tool[] = [
  {
    name: "listTables",
    description: "List all tables in the current diagram with their id and column count. Use to discover what exists.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "getTableDetails",
    description: "Get full details (columns with ids/types, indexes, related relationships) for one table by its id.",
    input_schema: {
      type: "object",
      properties: { tableId: { type: "string", description: "ID of the table to inspect" } },
      required: ["tableId"],
    },
  },
];

import type { DiagramDocument } from "@erdify/domain";

export type DiffChange =
  | { type: "addTable"; tableId: string; tableName: string }
  | { type: "removeTable"; tableId: string; tableName: string }
  | { type: "updateTable"; tableId: string; oldName: string; newName: string }
  | { type: "addColumn"; tableId: string; tableName: string; columnId: string; columnName: string; columnType: string; comment?: string }
  | { type: "removeColumn"; tableId: string; tableName: string; columnId: string; columnName: string }
  | { type: "updateColumn"; tableId: string; tableName: string; columnId: string; columnName: string; changes: string[] }
  | { type: "addRelation"; relationId: string; fromTable: string; toTable: string; cardinality: string }
  | { type: "removeRelation"; relationId: string; fromTable: string; toTable: string }
  | { type: "addIndex"; indexId: string; tableName: string; indexName: string; columnNames: string[]; unique: boolean };

export interface AiChatResponse {
  messageId: string;
  content: string;
  diff: DiffChange[] | null;
  pendingDocument: DiagramDocument | null;
}

export interface ColumnSuggestion {
  name: string;
  type: string;
  nullable: boolean;
  pk: boolean;
}

export interface OrgAiSettings {
  organizationId: string;
  hasApiKey: boolean;
  provider: "anthropic" | "openai";
  model: string;
}

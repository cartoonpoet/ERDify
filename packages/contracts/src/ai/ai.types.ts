import type { DiagramDocument } from "@erdify/domain";
import type { AiProviderId, AiModelOption } from "./models";

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

export type AiStreamEvent =
  | { type: "step"; text: string }
  | { type: "tool_call"; name: string; label: string }
  | { type: "tool_result"; change: DiffChange }
  | { type: "done"; messageId: string; content: string; diff: DiffChange[] | null; pendingDocument: DiagramDocument | null }
  | { type: "error"; message: string };

export interface AiChatHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  diff: DiffChange[] | null;
  accepted: boolean | null;
}

export interface ColumnSuggestion {
  name: string;
  type: string;
  nullable: boolean;
  pk: boolean;
}

export interface OrgAiSettings {
  organizationId: string;
  /** provider별 키 등록 여부 (키 값은 노출하지 않음) */
  providers: Record<AiProviderId, boolean>;
  /** 관리자가 허용한 모델 value 목록. 비어있으면 등록된 provider의 모든 모델 허용. */
  enabledModels: string[];
}

/** 채팅에서 고를 수 있는 모델 목록 (등록된 provider × 허용 모델). */
export interface AiChatConfig {
  models: AiModelOption[];
}

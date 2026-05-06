import { httpClient } from "./httpClient";

export interface ToolCallEntry {
  tool: string;
  summary: string;
}

export interface McpSessionResponse {
  id: string;
  summary: string | null;
  toolCalls: ToolCallEntry[];
  snapshotVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listMcpSessions = (diagramId: string): Promise<McpSessionResponse[]> =>
  httpClient
    .get<McpSessionResponse[]>(`/diagrams/${diagramId}/mcp-sessions`)
    .then((r) => r.data);

export const revertMcpSession = (diagramId: string, sessionId: string): Promise<void> =>
  httpClient
    .post(`/diagrams/${diagramId}/mcp-sessions/${sessionId}/revert`)
    .then(() => undefined);

import { httpClient } from "@/shared/api/httpClient";
import type { AiChatResponse, ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";

export const sendAiChat = (diagramId: string, message: string): Promise<AiChatResponse> =>
  httpClient.post<AiChatResponse>("/ai/chat", { diagramId, message }).then((r) => r.data);

export const acceptAiDiff = (messageId: string): Promise<void> =>
  httpClient.post(`/ai/chat/${messageId}/accept`).then(() => undefined);

export const rejectAiDiff = (messageId: string): Promise<void> =>
  httpClient.post(`/ai/chat/${messageId}/reject`).then(() => undefined);

export const suggestColumns = (
  tableName: string,
  existingColumns: string[],
): Promise<ColumnSuggestion[]> =>
  httpClient
    .post<ColumnSuggestion[]>("/ai/suggest-columns", { tableName, existingColumns })
    .then((r) => r.data);

export const getOrgAiSettings = (orgId: string): Promise<OrgAiSettings> =>
  httpClient.get<OrgAiSettings>(`/organizations/${orgId}/ai-settings`).then((r) => r.data);

export const updateOrgAiSettings = (orgId: string, apiKey: string): Promise<void> =>
  httpClient.put(`/organizations/${orgId}/ai-settings`, { apiKey }).then(() => undefined);

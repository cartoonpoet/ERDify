import { httpClient, API_BASE_URL } from "@/shared/api/httpClient";
import type { AiStreamEvent, AiChatHistoryMessage, AiChatConfig, ColumnSuggestion, OrgAiSettings, AiProviderId } from "@erdify/contracts";

export const getAiChatHistory = (diagramId: string): Promise<AiChatHistoryMessage[]> =>
  httpClient.get<AiChatHistoryMessage[]>(`/ai/chat/history/${diagramId}`).then((r) => r.data);

export const getAiChatConfig = (diagramId: string): Promise<AiChatConfig> =>
  httpClient.get<AiChatConfig>(`/ai/chat/config/${diagramId}`).then((r) => r.data);

export const streamAiChat = async (
  diagramId: string,
  message: string,
  model: string,
  onEvent: (event: AiStreamEvent) => void,
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diagramId, message, ...(model ? { model } : {}) }),
  });
  if (!res.ok || !res.body) throw new Error(`AI stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.replace(/^data: ?/, "").trim();
      if (!line) continue;
      onEvent(JSON.parse(line) as AiStreamEvent);
    }
  }
};

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

export const setOrgProviderKey = (orgId: string, provider: AiProviderId, apiKey: string): Promise<void> =>
  httpClient.put(`/organizations/${orgId}/ai-settings`, { provider, apiKey }).then(() => undefined);

export const removeOrgProviderKey = (orgId: string, provider: AiProviderId): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/ai-settings/${provider}`).then(() => undefined);

export const setEnabledModels = (orgId: string, enabledModels: string[]): Promise<void> =>
  httpClient.put(`/organizations/${orgId}/ai-models`, { enabledModels }).then(() => undefined);

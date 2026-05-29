import { httpClient, API_BASE_URL } from "@/shared/api/httpClient";
import type { AiChatResponse, ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";

export interface AiSessionResponse {
  id: string;
  diagramId: string;
  name: string;
  createdAt: string;
}

export const sendAiChat = (diagramId: string, message: string): Promise<AiChatResponse> =>
  httpClient.post<AiChatResponse>("/ai/chat", { diagramId, message }, { timeout: 120_000 }).then((r) => r.data);

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

export const updateOrgAiSettings = (orgId: string, apiKey: string, provider: "anthropic" | "openai", model: string): Promise<void> =>
  httpClient.put(`/organizations/${orgId}/ai-settings`, { apiKey, provider, model }).then(() => undefined);

export const sendAiChatStream = async (
  diagramId: string,
  message: string,
  sessionId: string | null,
  onText: (delta: string) => void,
  onDone: (result: { messageId: string; diff: unknown[] | null; pendingDocument: unknown | null }) => void,
  onError: (message: string) => void,
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ diagramId, message, sessionId }),
  });

  if (!response.ok || !response.body) {
    onError(`HTTP error: ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventBlock of events) {
      if (!eventBlock.trim()) continue;

      let eventType = "";
      let dataLine = "";

      for (const line of eventBlock.split("\n")) {
        if (line.startsWith("event:")) {
          eventType = line.slice("event:".length).trim();
        } else if (line.startsWith("data:")) {
          dataLine = line.slice("data:".length).trim();
        }
      }

      if (!dataLine) continue;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(dataLine) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (eventType === "text") {
        onText(parsed.delta as string);
      } else if (eventType === "done") {
        onDone(parsed as { messageId: string; diff: unknown[] | null; pendingDocument: unknown | null });
      } else if (eventType === "error") {
        onError(parsed.message as string);
      }
    }
  }
};

export const getSessions = (diagramId: string): Promise<AiSessionResponse[]> =>
  httpClient.get<AiSessionResponse[]>("/ai/sessions", { params: { diagramId } }).then((r) => r.data);

export const createSession = (diagramId: string): Promise<{ sessionId: string }> =>
  httpClient.post<{ sessionId: string }>("/ai/sessions", { diagramId }).then((r) => r.data);

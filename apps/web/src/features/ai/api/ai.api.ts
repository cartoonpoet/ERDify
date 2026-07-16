import { httpClient, API_BASE_URL } from "@/shared/api/httpClient";
import type { ColumnSuggestion, OrgAiSettings, AiChatConfig, AiProviderId } from "@erdify/contracts";

export interface AiSessionResponse {
  id: string;
  diagramId: string;
  name: string;
  createdAt: string;
}

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

export const getAiChatConfig = (diagramId: string): Promise<AiChatConfig> =>
  httpClient.get<AiChatConfig>(`/ai/chat/config/${diagramId}`).then((r) => r.data);

export type AiChatStreamDoneResult = {
  messageId: string;
  content?: string;
  diff: unknown[] | null;
  pendingDocument: unknown;
};

export interface AiChatStreamOptions {
  diagramId: string;
  message: string;
  sessionId: string | null;
  model: string;
  onText: (delta: string) => void;
  onDone: (result: AiChatStreamDoneResult) => void;
  onError: (message: string) => void;
  onStatus?: (label: string) => void;
}

interface SseEvent {
  eventType: string;
  data: Record<string, unknown>;
}

/** SSE 이벤트 블록에서 event 타입과 JSON data를 파싱한다. data가 없거나 JSON이 아니면 null. */
const parseSseEventBlock = (eventBlock: string): SseEvent | null => {
  let eventType = "";
  // SSE 규격상 data: 필드는 여러 줄로 나뉘어 올 수 있다 — 줄바꿈으로 이어 붙인다.
  const dataLines: string[] = [];

  for (const line of eventBlock.split("\n")) {
    if (line.startsWith("event:")) {
      eventType = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  const dataLine = dataLines.join("\n");
  if (!dataLine) return null;

  try {
    return { eventType, data: JSON.parse(dataLine) as Record<string, unknown> };
  } catch {
    return null;
  }
};

const dispatchSseEvent = (
  { eventType, data }: SseEvent,
  { onText, onDone, onError, onStatus }: AiChatStreamOptions,
): void => {
  if (eventType === "text") {
    onText(data.delta as string);
  } else if (eventType === "status") {
    onStatus?.(data.label as string);
  } else if (eventType === "done") {
    onDone(data as AiChatStreamDoneResult);
  } else if (eventType === "error") {
    onError(data.message as string);
  }
};

export const sendAiChatStream = async (options: AiChatStreamOptions): Promise<void> => {
  const { diagramId, message, sessionId, model, onError } = options;

  const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ diagramId, message, sessionId, ...(model ? { model } : {}) }),
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
      const event = parseSseEventBlock(eventBlock);
      if (event) dispatchSseEvent(event, options);
    }
  }
};

export const getSessions = (diagramId: string): Promise<AiSessionResponse[]> =>
  httpClient.get<AiSessionResponse[]>("/ai/sessions", { params: { diagramId } }).then((r) => r.data);

export const createSession = (diagramId: string): Promise<{ sessionId: string }> =>
  httpClient.post<{ sessionId: string }>("/ai/sessions", { diagramId }).then((r) => r.data);

export interface SessionMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  diff: unknown;
  accepted: boolean | null;
  createdAt: string;
}

export interface SessionMessagesResponse {
  messages: SessionMessageItem[];
  hasMore: boolean;
}

export const getSessionMessages = (
  sessionId: string,
  opts?: { limit?: number; before?: string },
): Promise<SessionMessagesResponse> =>
  httpClient
    .get<SessionMessagesResponse>(`/ai/sessions/${sessionId}/messages`, {
      params: {
        limit: opts?.limit ?? 50,
        ...(opts?.before ? { before: opts.before } : {}),
      },
    })
    .then((r) => r.data);

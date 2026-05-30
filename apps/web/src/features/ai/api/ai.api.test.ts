import {
  streamAiChat,
  acceptAiDiff,
  rejectAiDiff,
  suggestColumns,
  getOrgAiSettings,
  updateOrgAiSettings,
  getAiChatHistory,
} from "./ai.api";
import { httpClient } from "@/shared/api/httpClient";
import type { AiStreamEvent } from "@erdify/contracts";

vi.mock("@/shared/api/httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  API_BASE_URL: "http://localhost:4000/api",
}));

describe("ai.api", () => {
  it("streamAiChat은 SSE data 라인을 파싱해 onEvent로 전달한다", async () => {
    const chunks = [
      'data: {"type":"step","text":"안녕"}\n\n',
      'data: {"type":"done","messageId":"m1","content":"끝","diff":null,"pendingDocument":null}\n\n',
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder();
        for (const c of chunks) controller.enqueue(enc.encode(c));
        controller.close();
      },
    });
    global.fetch = vi.fn(async () => new Response(stream, { status: 200 })) as unknown as typeof fetch;

    const events: AiStreamEvent[] = [];
    await streamAiChat("d1", "hi", false, (e) => events.push(e));

    expect(events.map((e) => e.type)).toEqual(["step", "done"]);
  });

  it("getAiChatHistory는 GET /ai/chat/history/:diagramId를 호출하고 r.data를 반환한다", async () => {
    const rows = [{ id: "m1", role: "user", content: "안녕", diff: null, accepted: null }];
    vi.mocked(httpClient.get).mockResolvedValue({ data: rows });

    const result = await getAiChatHistory("diagram-1");

    expect(httpClient.get).toHaveBeenCalledWith("/ai/chat/history/diagram-1");
    expect(result).toEqual(rows);
  });

  it("acceptAiDiff는 POST /ai/chat/:id/accept를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: undefined });

    const result = await acceptAiDiff("msg-1");

    expect(httpClient.post).toHaveBeenCalledWith("/ai/chat/msg-1/accept");
    expect(result).toBeUndefined();
  });

  it("rejectAiDiff는 POST /ai/chat/:id/reject를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: undefined });

    const result = await rejectAiDiff("msg-1");

    expect(httpClient.post).toHaveBeenCalledWith("/ai/chat/msg-1/reject");
    expect(result).toBeUndefined();
  });

  it("suggestColumns는 POST /ai/suggest-columns를 호출하고 r.data를 반환한다", async () => {
    const mockSuggestions = [{ name: "id", type: "INT" }, { name: "name", type: "VARCHAR" }];
    vi.mocked(httpClient.post).mockResolvedValue({ data: mockSuggestions });

    const result = await suggestColumns("users", ["id"]);

    expect(httpClient.post).toHaveBeenCalledWith("/ai/suggest-columns", {
      tableName: "users",
      existingColumns: ["id"],
    });
    expect(result).toEqual(mockSuggestions);
  });

  it("getOrgAiSettings는 GET /organizations/:orgId/ai-settings를 호출하고 r.data를 반환한다", async () => {
    const mockSettings = { provider: "anthropic", model: "claude-3-5-sonnet-20241022", hasApiKey: true };
    vi.mocked(httpClient.get).mockResolvedValue({ data: mockSettings });

    const result = await getOrgAiSettings("org-1");

    expect(httpClient.get).toHaveBeenCalledWith("/organizations/org-1/ai-settings");
    expect(result).toEqual(mockSettings);
  });

  it("updateOrgAiSettings는 PUT /organizations/:orgId/ai-settings를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ data: undefined });

    const result = await updateOrgAiSettings("org-1", "sk-test-key", "anthropic", "claude-3-5-sonnet-20241022");

    expect(httpClient.put).toHaveBeenCalledWith("/organizations/org-1/ai-settings", {
      apiKey: "sk-test-key",
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });
    expect(result).toBeUndefined();
  });
});

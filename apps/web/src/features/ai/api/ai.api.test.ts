import {
  acceptAiDiff,
  rejectAiDiff,
  suggestColumns,
  getOrgAiSettings,
  setOrgProviderKey,
  removeOrgProviderKey,
  setEnabledModels,
  getSessionMessages,
} from "./ai.api";
import { httpClient } from "@/shared/api/httpClient";

vi.mock("@/shared/api/httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe("ai.api", () => {
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

  it("setOrgProviderKey는 PUT /organizations/:orgId/ai-settings를 {provider, apiKey}로 호출한다", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ data: undefined });
    await setOrgProviderKey("org-1", "openai", "sk-test-key");
    expect(httpClient.put).toHaveBeenCalledWith("/organizations/org-1/ai-settings", { provider: "openai", apiKey: "sk-test-key" });
  });

  it("removeOrgProviderKey는 DELETE /organizations/:orgId/ai-settings/:provider를 호출한다", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({ data: undefined });
    await removeOrgProviderKey("org-1", "openai");
    expect(httpClient.delete).toHaveBeenCalledWith("/organizations/org-1/ai-settings/openai");
  });

  it("setEnabledModels는 PUT /organizations/:orgId/ai-models를 호출한다", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ data: undefined });
    await setEnabledModels("org-1", ["gpt-4o"]);
    expect(httpClient.put).toHaveBeenCalledWith("/organizations/org-1/ai-models", { enabledModels: ["gpt-4o"] });
  });

  it("getSessionMessages는 GET /ai/sessions/:sessionId/messages를 호출하고 r.data를 반환한다", async () => {
    const mockMessages = [
      {
        id: "msg-1",
        role: "user" as const,
        content: "안녕",
        diff: null,
        accepted: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "msg-2",
        role: "assistant" as const,
        content: "안녕하세요!",
        diff: null,
        accepted: null,
        createdAt: "2026-01-01T00:01:00.000Z",
      },
    ];
    vi.mocked(httpClient.get).mockResolvedValue({ data: mockMessages });

    const result = await getSessionMessages("sess-abc");

    expect(httpClient.get).toHaveBeenCalledWith("/ai/sessions/sess-abc/messages");
    expect(result).toEqual(mockMessages);
  });

  it("getSessionMessages는 빈 세션에 대해 빈 배열을 반환한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });

    const result = await getSessionMessages("empty-sess");

    expect(httpClient.get).toHaveBeenCalledWith("/ai/sessions/empty-sess/messages");
    expect(result).toEqual([]);
  });
});

import {
  sendAiChat,
  acceptAiDiff,
  rejectAiDiff,
  suggestColumns,
  getOrgAiSettings,
  updateOrgAiSettings,
} from "./ai.api";
import { httpClient } from "@/shared/api/httpClient";

vi.mock("@/shared/api/httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

describe("ai.api", () => {
  it("sendAiChat은 POST /ai/chat을 timeout:120000 옵션과 함께 호출하고 r.data를 반환한다", async () => {
    const mockResponse = {
      messageId: "msg-1",
      content: "응답 내용",
      diff: null,
      pendingDocument: null,
    };
    vi.mocked(httpClient.post).mockResolvedValue({ data: mockResponse });

    const result = await sendAiChat("diagram-1", "테이블 추가해줘");

    expect(httpClient.post).toHaveBeenCalledWith(
      "/ai/chat",
      { diagramId: "diagram-1", message: "테이블 추가해줘" },
      { timeout: 120_000 },
    );
    expect(result).toEqual(mockResponse);
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

import { listMcpSessions, revertMcpSession } from "./mcp-sessions.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

describe("mcp-sessions.api", () => {
  it("listMcpSessions는 GET /diagrams/:id/mcp-sessions를 호출하고 r.data를 반환한다", async () => {
    const sessions = [
      {
        id: "s1",
        summary: "session summary",
        toolCalls: [{ tool: "createTable", summary: "created users table" }],
        snapshotVersionId: "v1",
        createdAt: "",
        updatedAt: "",
      },
    ];
    vi.mocked(httpClient.get).mockResolvedValue({ data: sessions });
    const result = await listMcpSessions("d1");
    expect(httpClient.get).toHaveBeenCalledWith("/diagrams/d1/mcp-sessions");
    expect(result).toEqual(sessions);
  });

  it("revertMcpSession은 POST /diagrams/:id/mcp-sessions/:sid/revert를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: undefined });
    const result = await revertMcpSession("d1", "s1");
    expect(httpClient.post).toHaveBeenCalledWith("/diagrams/d1/mcp-sessions/s1/revert");
    expect(result).toBeUndefined();
  });
});

import { listApiKeys, createApiKey, revokeApiKey, regenerateApiKey } from "./api-keys.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockKey = {
  id: "key-1",
  name: "Production",
  prefix: "erd_abcdef012345",
  expiresAt: "2026-12-31T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("api-keys.api", () => {
  it("listApiKeys calls GET /auth/api-keys", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [mockKey] });
    const result = await listApiKeys();
    expect(httpClient.get).toHaveBeenCalledWith("/auth/api-keys");
    expect(result).toEqual([mockKey]);
  });

  it("createApiKey calls POST /auth/api-keys with body", async () => {
    const created = { apiKey: "erd_fullkey", ...mockKey };
    vi.mocked(httpClient.post).mockResolvedValue({ data: created });
    const result = await createApiKey({ name: "Production", expiresAt: "2026-12-31T00:00:00.000Z" });
    expect(httpClient.post).toHaveBeenCalledWith("/auth/api-keys", { name: "Production", expiresAt: "2026-12-31T00:00:00.000Z" });
    expect(result).toEqual(created);
  });

  it("revokeApiKey calls DELETE /auth/api-keys/:id", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({});
    await revokeApiKey("key-1");
    expect(httpClient.delete).toHaveBeenCalledWith("/auth/api-keys/key-1");
  });

  it("regenerateApiKey calls POST /auth/api-keys/:id/regenerate", async () => {
    const created = { apiKey: "erd_newkey", ...mockKey, id: "key-2" };
    vi.mocked(httpClient.post).mockResolvedValue({ data: created });
    const result = await regenerateApiKey("key-1");
    expect(httpClient.post).toHaveBeenCalledWith("/auth/api-keys/key-1/regenerate");
    expect(result).toEqual(created);
  });
});

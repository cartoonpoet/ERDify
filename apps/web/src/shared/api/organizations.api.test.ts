import { listMyOrganizations, createOrganization } from "./organizations.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

describe("organizations.api", () => {
  it("listMyOrganizations는 GET /organizations를 호출한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    const result = await listMyOrganizations();
    expect(httpClient.get).toHaveBeenCalledWith("/organizations");
    expect(result).toEqual([]);
  });

  it("createOrganization은 POST /organizations를 호출한다", async () => {
    const org = { id: "1", name: "Acme", ownerId: "u1", createdAt: "", updatedAt: "" };
    vi.mocked(httpClient.post).mockResolvedValue({ data: org });
    const result = await createOrganization({ name: "Acme" });
    expect(httpClient.post).toHaveBeenCalledWith("/organizations", { name: "Acme" });
    expect(result).toEqual(org);
  });
});

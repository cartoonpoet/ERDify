import { listProjects, createProject } from "./projects.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

describe("projects.api", () => {
  it("listProjects는 GET /organizations/:orgId/projects를 호출한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    await listProjects("org-1");
    expect(httpClient.get).toHaveBeenCalledWith("/organizations/org-1/projects");
  });

  it("createProject는 POST /organizations/:orgId/projects를 호출한다", async () => {
    const project = { id: "p1", organizationId: "org-1", name: "Backend", description: null, createdAt: "", updatedAt: "" };
    vi.mocked(httpClient.post).mockResolvedValue({ data: project });
    const result = await createProject("org-1", { name: "Backend" });
    expect(httpClient.post).toHaveBeenCalledWith("/organizations/org-1/projects", { name: "Backend" });
    expect(result).toEqual(project);
  });
});

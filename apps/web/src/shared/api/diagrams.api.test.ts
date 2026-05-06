import {
  createDiagram,
  listDiagrams,
  getDiagram,
  updateDiagram,
  saveVersion,
  listVersions,
  restoreVersion,
  deleteDiagram,
  shareDiagram,
  revokeDiagramShare,
  getPublicDiagram,
} from "./diagrams.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mockDiagram = {
  id: "d1",
  projectId: "p1",
  organizationId: "o1",
  name: "Test Diagram",
  content: { tables: [], relations: [] } as any,
  createdBy: "u1",
  createdAt: "",
  updatedAt: "",
  myRole: "owner" as const,
  shareToken: null,
  shareExpiresAt: null,
};

const mockVersion = {
  id: "v1",
  diagramId: "d1",
  content: { tables: [], relations: [] } as any,
  revision: 1,
  createdBy: "u1",
  createdAt: "",
};

describe("diagrams.api", () => {
  it("createDiagram은 POST /projects/:id/diagrams를 호출하고 r.data를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: mockDiagram });
    const result = await createDiagram("p1", { name: "Test Diagram", dialect: "mysql" });
    expect(httpClient.post).toHaveBeenCalledWith("/projects/p1/diagrams", { name: "Test Diagram", dialect: "mysql" });
    expect(result).toEqual(mockDiagram);
  });

  it("listDiagrams는 GET /projects/:id/diagrams를 호출하고 r.data를 반환한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [mockDiagram] });
    const result = await listDiagrams("p1");
    expect(httpClient.get).toHaveBeenCalledWith("/projects/p1/diagrams");
    expect(result).toEqual([mockDiagram]);
  });

  it("getDiagram은 GET /diagrams/:id를 호출하고 r.data를 반환한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: mockDiagram });
    const result = await getDiagram("d1");
    expect(httpClient.get).toHaveBeenCalledWith("/diagrams/d1");
    expect(result).toEqual(mockDiagram);
  });

  it("updateDiagram은 PATCH /diagrams/:id를 호출하고 r.data를 반환한다", async () => {
    const updated = { ...mockDiagram, name: "Renamed" };
    vi.mocked(httpClient.patch).mockResolvedValue({ data: updated });
    const result = await updateDiagram("d1", { name: "Renamed" });
    expect(httpClient.patch).toHaveBeenCalledWith("/diagrams/d1", { name: "Renamed" });
    expect(result).toEqual(updated);
  });

  it("saveVersion은 POST /diagrams/:id/versions를 호출하고 r.data를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: mockVersion });
    const result = await saveVersion("d1");
    expect(httpClient.post).toHaveBeenCalledWith("/diagrams/d1/versions");
    expect(result).toEqual(mockVersion);
  });

  it("listVersions는 GET /diagrams/:id/versions를 호출하고 r.data를 반환한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [mockVersion] });
    const result = await listVersions("d1");
    expect(httpClient.get).toHaveBeenCalledWith("/diagrams/d1/versions");
    expect(result).toEqual([mockVersion]);
  });

  it("restoreVersion은 POST /diagrams/:id/restore/:vid를 호출하고 r.data를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: mockDiagram });
    const result = await restoreVersion("d1", "v1");
    expect(httpClient.post).toHaveBeenCalledWith("/diagrams/d1/restore/v1");
    expect(result).toEqual(mockDiagram);
  });

  it("deleteDiagram은 DELETE /diagrams/:id를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({ data: undefined });
    const result = await deleteDiagram("d1");
    expect(httpClient.delete).toHaveBeenCalledWith("/diagrams/d1");
    expect(result).toBeUndefined();
  });

  it("shareDiagram은 POST /diagrams/:id/share를 호출하고 r.data를 반환한다", async () => {
    const shareLink = { shareToken: "tok", expiresAt: "2026-01-01T00:00:00Z" };
    vi.mocked(httpClient.post).mockResolvedValue({ data: shareLink });
    const result = await shareDiagram("d1", "1d");
    expect(httpClient.post).toHaveBeenCalledWith("/diagrams/d1/share", { preset: "1d" });
    expect(result).toEqual(shareLink);
  });

  it("revokeDiagramShare는 DELETE /diagrams/:id/share를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({ data: undefined });
    const result = await revokeDiagramShare("d1");
    expect(httpClient.delete).toHaveBeenCalledWith("/diagrams/d1/share");
    expect(result).toBeUndefined();
  });

  it("getPublicDiagram은 GET /diagrams/public/:token을 호출하고 r.data를 반환한다", async () => {
    const pub = { id: "d1", name: "Test Diagram", content: { tables: [], relations: [] } as any };
    vi.mocked(httpClient.get).mockResolvedValue({ data: pub });
    const result = await getPublicDiagram("tok");
    expect(httpClient.get).toHaveBeenCalledWith("/diagrams/public/tok");
    expect(result).toEqual(pub);
  });
});

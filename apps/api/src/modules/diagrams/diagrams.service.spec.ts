import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Diagram, DiagramVersion, OrganizationMember, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { DiagramsService } from "./diagrams.service";

type MockRepo<_T> = {
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

const makeProject = (o: Partial<Project> = {}): Project =>
  ({ id: "proj-1", organizationId: "org-1", ...o }) as Project;

const makeDiagram = (o: Partial<Diagram> = {}): Diagram =>
  ({ id: "diag-1", projectId: "proj-1", name: "ERD", content: {} as object, ...o }) as Diagram;

const makeVersion = (o: Partial<DiagramVersion> = {}): DiagramVersion =>
  ({ id: "v1", diagramId: "diag-1", revision: 1, ...o }) as DiagramVersion;

const makeMember = (role = "editor"): OrganizationMember =>
  ({ organizationId: "org-1", userId: "user-1", role }) as OrganizationMember;

describe("DiagramsService", () => {
  let service: DiagramsService;
  let diagramRepo: MockRepo<Diagram>;
  let versionRepo: MockRepo<DiagramVersion>;
  let projectRepo: MockRepo<Project>;
  let memberRepo: MockRepo<OrganizationMember>;

  beforeEach(() => {
    diagramRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
    versionRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
    projectRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
    memberRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
    service = new DiagramsService(
      diagramRepo as unknown as Repository<Diagram>,
      versionRepo as unknown as Repository<DiagramVersion>,
      projectRepo as unknown as Repository<Project>,
      memberRepo as unknown as Repository<OrganizationMember>
    );
  });

  describe("create", () => {
    it("throws ForbiddenException for viewer", async () => {
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));
      await expect(
        service.create("proj-1", "user-1", { name: "ERD", dialect: "postgresql" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("creates and returns diagram", async () => {
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("owner"));
      diagramRepo.create.mockReturnValue(diagram);
      diagramRepo.save.mockResolvedValue(diagram);
      const result = await service.create("proj-1", "user-1", { name: "ERD", dialect: "postgresql" });
      expect(result).toEqual(diagram);
    });
  });

  describe("findAll", () => {
    it("throws ForbiddenException if not member", async () => {
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.findAll("proj-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("returns diagrams for member", async () => {
      const diagrams = [makeDiagram()];
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember());
      diagramRepo.find.mockResolvedValue(diagrams);
      expect(await service.findAll("proj-1", "user-1")).toEqual(diagrams);
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException for unknown diagram", async () => {
      diagramRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("x", "user-1")).rejects.toThrow(NotFoundException);
    });

    it("returns diagram for member", async () => {
      const diagram = makeDiagram();
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember());
      expect(await service.findOne("diag-1", "user-1")).toEqual(diagram);
    });
  });

  describe("saveVersion", () => {
    it("increments revision from last version", async () => {
      const diagram = makeDiagram();
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("owner"));
      versionRepo.findOne.mockResolvedValue(makeVersion({ revision: 3 }));
      const version = makeVersion({ revision: 4 });
      versionRepo.create.mockReturnValue(version);
      versionRepo.save.mockResolvedValue(version);
      const result = await service.saveVersion("diag-1", "user-1");
      expect(result.revision).toBe(4);
    });

    it("starts at revision 1 when no prior versions", async () => {
      const diagram = makeDiagram();
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      versionRepo.findOne.mockResolvedValue(null);
      const version = makeVersion({ revision: 1 });
      versionRepo.create.mockReturnValue(version);
      versionRepo.save.mockResolvedValue(version);
      const result = await service.saveVersion("diag-1", "user-1");
      expect(result.revision).toBe(1);
    });
  });
});

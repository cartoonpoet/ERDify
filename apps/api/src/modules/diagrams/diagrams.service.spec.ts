import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Diagram, DiagramVersion, Organization, OrganizationMember, Project, User } from "@erdify/db";
import type { Repository } from "typeorm";
import { DiagramsService } from "./diagrams.service";
import { DiagramsCrudService } from "./services/diagrams-crud.service";
import { DiagramsSchemaService } from "./services/diagrams-schema.service";
import { DiagramsVersionService } from "./services/diagrams-version.service";
import { DiagramsShareService } from "./services/diagrams-share.service";
import { AuthorizationService } from "../../common/services/authorization.service";
import type { DomainLoaderService } from "../../common/services/domain-loader.service";
import type { DiagramDocument } from "@erdify/domain";
import * as erdifyDomain from "@erdify/domain";
import type { CollaborationService } from "../collaboration/collaboration.service";

const makeDoc = (overrides: Partial<DiagramDocument> = {}): DiagramDocument => ({
  format: "erdify.schema.v1",
  id: "diag-1",
  name: "ERD",
  dialect: "postgresql",
  entities: [],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
  ...overrides,
});

type MockRepo<_T> = {
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  remove?: ReturnType<typeof vi.fn>;
};

const makeProject = (o: Partial<Project> = {}): Project =>
  ({ id: "proj-1", organizationId: "org-1", name: "Test Project", ...o }) as Project;

const makeDiagram = (o: Partial<Diagram> = {}): Diagram =>
  ({ id: "diag-1", projectId: "proj-1", name: "ERD", content: {} as object, ...o }) as Diagram;

const makeVersion = (o: Partial<DiagramVersion> = {}): DiagramVersion =>
  ({ id: "v1", diagramId: "diag-1", revision: 1, ...o }) as DiagramVersion;

const makeMember = (role = "editor"): OrganizationMember =>
  ({ organizationId: "org-1", userId: "user-1", role }) as OrganizationMember;

const makeEntity = (id = "ent-1", columns: DiagramDocument["entities"][number]["columns"] = []) =>
  ({ id, name: "users", logicalName: null, comment: null, color: null, columns });

const makeColumn = (id = "col-1"): DiagramDocument["entities"][number]["columns"][number] => ({
  id,
  name: "id",
  type: "uuid",
  nullable: false,
  primaryKey: true,
  unique: true,
  defaultValue: null,
  comment: null,
  ordinal: 0,
});

const makeRelationship = (id = "rel-1") => ({
  id,
  name: "",
  sourceEntityId: "ent-1",
  sourceColumnIds: [],
  targetEntityId: "ent-2",
  targetColumnIds: [],
  cardinality: "one-to-many" as const,
  onDelete: "no-action" as const,
  onUpdate: "no-action" as const,
  identifying: false,
});

const mockCollaborationService = {
  getRoomPresences: vi.fn(),
};

describe("DiagramsService", () => {
  let service: DiagramsService;
  let diagramRepo: MockRepo<Diagram>;
  let versionRepo: MockRepo<DiagramVersion>;
  let projectRepo: MockRepo<Project>;
  let orgRepo: MockRepo<Organization>;
  let memberRepo: MockRepo<OrganizationMember>;
  let userRepo: MockRepo<User>;

  beforeEach(() => {
    diagramRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn(), query: vi.fn(), remove: vi.fn() };
    versionRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn(), query: vi.fn() };
    projectRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn(), query: vi.fn() };
    orgRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn(), query: vi.fn() };
    memberRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn(), query: vi.fn() };
    userRepo = { findOne: vi.fn(), find: vi.fn().mockResolvedValue([]), create: vi.fn(), save: vi.fn(), query: vi.fn() };

    const authService = new AuthorizationService(memberRepo as unknown as Repository<OrganizationMember>);
    const domainLoader = { load: vi.fn().mockResolvedValue(erdifyDomain) } as unknown as DomainLoaderService;

    const crud = new DiagramsCrudService(
      diagramRepo as unknown as Repository<Diagram>,
      projectRepo as unknown as Repository<Project>,
      orgRepo as unknown as Repository<Organization>,
      authService
    );
    const schema = new DiagramsSchemaService(
      diagramRepo as unknown as Repository<Diagram>,
      projectRepo as unknown as Repository<Project>,
      authService,
      domainLoader
    );
    const version = new DiagramsVersionService(
      diagramRepo as unknown as Repository<Diagram>,
      versionRepo as unknown as Repository<DiagramVersion>,
      projectRepo as unknown as Repository<Project>,
      userRepo as unknown as Repository<User>,
      authService
    );
    const share = new DiagramsShareService(
      diagramRepo as unknown as Repository<Diagram>,
      projectRepo as unknown as Repository<Project>,
      authService
    );

    service = new DiagramsService(crud, schema, version, share, mockCollaborationService as unknown as CollaborationService);
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
      const rows = [{ id: "diag-1", projectId: "proj-1", name: "ERD", dialect: "postgresql", previewEntities: [] }];
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember());
      diagramRepo.query.mockResolvedValue(rows);
      expect(await service.findAll("proj-1", "user-1")).toEqual(rows);
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
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      memberRepo.findOne.mockResolvedValue(makeMember());
      expect(await service.findOne("diag-1", "user-1")).toEqual({
        ...diagram,
        organizationId: "org-1",
        organizationName: "Test Org",
        projectName: "Test Project",
        myRole: "editor",
      });
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

  describe("restoreVersion", () => {
    it("throws NotFoundException when diagram does not exist", async () => {
      diagramRepo.findOne.mockResolvedValue(null);

      await expect(service.restoreVersion("missing-diag", "v1", "user-1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("restores version content to current diagram", async () => {
      const version = makeVersion({ content: { restored: true } as unknown as object });
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.findOne.mockResolvedValue(diagram);
      versionRepo.findOne.mockResolvedValue(version);
      diagramRepo.save.mockImplementation((d: Diagram) => Promise.resolve(d));

      const result = await service.restoreVersion("diag-1", "v1", "user-1");

      expect(result.content).toEqual({ restored: true });
      expect(diagramRepo.save).toHaveBeenCalled();
    });

    it("throws NotFoundException when version does not exist", async () => {
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.findOne.mockResolvedValue(diagram);
      versionRepo.findOne.mockResolvedValue(null);

      await expect(service.restoreVersion("diag-1", "missing", "user-1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws ForbiddenException for viewer role", async () => {
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));
      diagramRepo.findOne.mockResolvedValue(diagram);

      await expect(service.restoreVersion("diag-1", "v1", "user-1")).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe("generateShareLink", () => {
    it("generates shareToken and expiresAt for editor", async () => {
      const diagram = makeDiagram({ shareToken: null, shareExpiresAt: null });
      projectRepo.findOne.mockResolvedValue(makeProject());
      diagramRepo.findOne.mockResolvedValue(diagram);
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.generateShareLink("diag-1", "user-1", "1d");

      expect(result.shareToken).toHaveLength(36);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("throws ForbiddenException for viewer", async () => {
      projectRepo.findOne.mockResolvedValue(makeProject());
      diagramRepo.findOne.mockResolvedValue(makeDiagram());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

      await expect(service.generateShareLink("diag-1", "user-1", "1d")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("revokeShareLink", () => {
    it("clears shareToken and shareExpiresAt", async () => {
      const diagram = makeDiagram({ shareToken: "tok-abc", shareExpiresAt: new Date() });
      projectRepo.findOne.mockResolvedValue(makeProject());
      diagramRepo.findOne.mockResolvedValue(diagram);
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      await service.revokeShareLink("diag-1", "user-1");

      expect(diagramRepo.save).toHaveBeenCalledWith(expect.objectContaining({ shareToken: null, shareExpiresAt: null }));
    });
  });

  describe("getPublicDiagram", () => {
    it("returns id, name, content for valid token", async () => {
      const future = new Date(Date.now() + 86400000);
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ shareToken: "tok-abc", shareExpiresAt: future, name: "ERD" }));

      const result = await service.getPublicDiagram("tok-abc");

      expect(result).toEqual({ id: "diag-1", name: "ERD", content: {} });
    });

    it("throws NotFoundException for unknown token", async () => {
      diagramRepo.findOne.mockResolvedValue(null);

      await expect(service.getPublicDiagram("bad-tok")).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for expired token", async () => {
      const past = new Date(Date.now() - 1000);
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ shareToken: "tok-abc", shareExpiresAt: past }));

      await expect(service.getPublicDiagram("tok-abc")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("addTable", () => {
    it("adds entity and returns updated diagram", async () => {
      const diagram = makeDiagram({ content: makeDoc() as unknown as object });
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.addTable("diag-1", "user-1", { name: "users" });

      const doc = result.content as unknown as DiagramDocument;
      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0]!.name).toBe("users");
    });

    it("throws ForbiddenException for viewer", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

      await expect(service.addTable("diag-1", "user-1", { name: "users" })).rejects.toThrow(ForbiddenException);
    });

    it("sets entity position when x and y are provided", async () => {
      const diagram = makeDiagram({ content: makeDoc() as unknown as object });
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.addTable("diag-1", "user-1", { name: "users", x: 100, y: 200 });

      const doc = result.content as unknown as DiagramDocument;
      const entityId = doc.entities[0]!.id;
      expect(doc.layout.entityPositions[entityId]).toEqual({ x: 100, y: 200 });
    });
  });

  describe("updateTable", () => {
    it("renames entity", async () => {
      const doc = makeDoc({ entities: [{ id: "ent-1", name: "old", logicalName: null, comment: null, color: null, columns: [] }] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateTable("diag-1", "ent-1", "user-1", { name: "new" });

      const resultDoc = result.content as unknown as DiagramDocument;
      expect(resultDoc.entities[0]!.name).toBe("new");
    });

    it("throws NotFoundException for unknown tableId", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));

      await expect(service.updateTable("diag-1", "bad-id", "user-1", { name: "x" })).rejects.toThrow(NotFoundException);
    });

    it("updates entity color and comment", async () => {
      const doc = makeDoc({ entities: [{ id: "ent-1", name: "users", logicalName: null, comment: null, color: null, columns: [] }] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateTable("diag-1", "ent-1", "user-1", { color: "#ff0000", comment: "main table" });

      const resultDoc = result.content as unknown as DiagramDocument;
      expect(resultDoc.entities[0]!.color).toBe("#ff0000");
      expect(resultDoc.entities[0]!.comment).toBe("main table");
    });
  });

  describe("removeTable", () => {
    it("removes entity from diagram", async () => {
      const doc = makeDoc({ entities: [{ id: "ent-1", name: "users", logicalName: null, comment: null, color: null, columns: [] }] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      await service.removeTable("diag-1", "ent-1", "user-1");

      expect(diagramRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.objectContaining({ entities: [] }) })
      );
    });

    it("throws NotFoundException for unknown tableId", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));

      await expect(service.removeTable("diag-1", "bad-id", "user-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("addColumn", () => {
    it("adds column to entity", async () => {
      const doc = makeDoc({ entities: [makeEntity()] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.addColumn("diag-1", "ent-1", "user-1", {
        name: "email",
        type: "varchar",
      });

      const resultDoc = result.content as unknown as DiagramDocument;
      expect(resultDoc.entities[0]!.columns).toHaveLength(1);
      expect(resultDoc.entities[0]!.columns[0]!.name).toBe("email");
    });

    it("throws NotFoundException for unknown tableId", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));

      await expect(
        service.addColumn("diag-1", "bad-id", "user-1", { name: "email", type: "varchar" })
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for viewer", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc({ entities: [makeEntity()] }) as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

      await expect(
        service.addColumn("diag-1", "ent-1", "user-1", { name: "email", type: "varchar" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("applies defaults for nullable, primaryKey, unique, defaultValue", async () => {
      const doc = makeDoc({ entities: [makeEntity()] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.addColumn("diag-1", "ent-1", "user-1", { name: "email", type: "varchar" });

      const resultDoc = result.content as unknown as DiagramDocument;
      const col = resultDoc.entities[0]!.columns[0]!;
      expect(col.nullable).toBe(true);
      expect(col.primaryKey).toBe(false);
      expect(col.unique).toBe(false);
      expect(col.defaultValue).toBeNull();
      expect(col.comment).toBeNull();
    });
  });

  describe("updateColumn", () => {
    it("updates column properties", async () => {
      const col = makeColumn();
      const doc = makeDoc({ entities: [makeEntity("ent-1", [col])] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateColumn("diag-1", "ent-1", "col-1", "user-1", {
        name: "user_id",
      });

      const resultDoc = result.content as unknown as DiagramDocument;
      expect(resultDoc.entities[0]!.columns[0]!.name).toBe("user_id");
    });

    it("throws NotFoundException for unknown columnId", async () => {
      const doc = makeDoc({ entities: [makeEntity("ent-1", [])] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));

      await expect(
        service.updateColumn("diag-1", "ent-1", "bad-col", "user-1", { name: "x" })
      ).rejects.toThrow(NotFoundException);
    });

    it("preserves unchanged fields (merge semantics)", async () => {
      const col = makeColumn();
      const doc = makeDoc({ entities: [makeEntity("ent-1", [col])] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateColumn("diag-1", "ent-1", "col-1", "user-1", { name: "user_id" });

      const resultDoc = result.content as unknown as DiagramDocument;
      const updated = resultDoc.entities[0]!.columns[0]!;
      expect(updated.name).toBe("user_id");
      expect(updated.type).toBe("uuid");       // unchanged
      expect(updated.primaryKey).toBe(true);   // unchanged
    });
  });

  describe("removeColumn", () => {
    it("removes column from entity", async () => {
      const col = makeColumn();
      const doc = makeDoc({ entities: [makeEntity("ent-1", [col])] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      await service.removeColumn("diag-1", "ent-1", "col-1", "user-1");

      expect(diagramRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            entities: [expect.objectContaining({ columns: [] })],
          }),
        })
      );
    });

    it("throws NotFoundException for unknown columnId", async () => {
      const doc = makeDoc({ entities: [makeEntity("ent-1", [])] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));

      await expect(service.removeColumn("diag-1", "ent-1", "bad-col", "user-1")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("addRelationship", () => {
    it("adds relationship to diagram", async () => {
      const doc = makeDoc({
        entities: [makeEntity("ent-1"), makeEntity("ent-2")],
      });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.addRelationship("diag-1", "user-1", {
        sourceEntityId: "ent-1",
        sourceColumnIds: [],
        targetEntityId: "ent-2",
        targetColumnIds: [],
        cardinality: "one-to-many",
      });

      const resultDoc = result.content as unknown as DiagramDocument;
      expect(resultDoc.relationships).toHaveLength(1);
      expect(resultDoc.relationships[0]!.cardinality).toBe("one-to-many");
    });

    it("throws ForbiddenException for viewer", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

      await expect(
        service.addRelationship("diag-1", "user-1", {
          sourceEntityId: "ent-1",
          sourceColumnIds: [],
          targetEntityId: "ent-2",
          targetColumnIds: [],
          cardinality: "one-to-many",
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateRelationship", () => {
    it("updates cardinality", async () => {
      const doc = makeDoc({ relationships: [makeRelationship()] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateRelationship("diag-1", "rel-1", "user-1", {
        cardinality: "one-to-one",
      });

      const resultDoc = result.content as unknown as DiagramDocument;
      expect(resultDoc.relationships[0]!.cardinality).toBe("one-to-one");
    });

    it("throws NotFoundException for unknown relationshipId", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));

      await expect(
        service.updateRelationship("diag-1", "bad-id", "user-1", { cardinality: "one-to-one" })
      ).rejects.toThrow(NotFoundException);
    });

    it("preserves unchanged fields (merge semantics)", async () => {
      const doc = makeDoc({ relationships: [makeRelationship()] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateRelationship("diag-1", "rel-1", "user-1", {
        cardinality: "one-to-one",
      });

      const resultDoc = result.content as unknown as DiagramDocument;
      const rel = resultDoc.relationships[0]!;
      expect(rel.cardinality).toBe("one-to-one");
      expect(rel.onDelete).toBe("no-action");   // unchanged
      expect(rel.identifying).toBe(false);       // unchanged
    });
  });

  describe("removeRelationship", () => {
    it("removes relationship", async () => {
      const doc = makeDoc({ relationships: [makeRelationship()] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      await service.removeRelationship("diag-1", "rel-1", "user-1");

      expect(diagramRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({ relationships: [] }),
        })
      );
    });

    it("throws NotFoundException for unknown relationshipId", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));

      await expect(service.removeRelationship("diag-1", "bad-id", "user-1")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("duplicate", () => {
    const makeSourceDoc = (): DiagramDocument =>
      makeDoc({
        name: "원본",
        entities: [
          makeEntity("ent-1", [makeColumn("col-1")]),
          makeEntity("ent-2", [makeColumn("col-2")]),
        ],
        relationships: [
          {
            ...makeRelationship("rel-1"),
            sourceEntityId: "ent-1",
            sourceColumnIds: ["col-1"],
            targetEntityId: "ent-2",
            targetColumnIds: ["col-2"],
          },
        ],
        indexes: [
          {
            id: "idx-1",
            entityId: "ent-1",
            columnIds: ["col-1"],
            name: "idx_users_id",
            unique: false,
          },
        ],
        layout: {
          entityPositions: {
            "ent-1": { x: 10, y: 20 },
            "ent-2": { x: 30, y: 40 },
          },
        },
      });

    it("throws NotFoundException for unknown diagram", async () => {
      diagramRepo.findOne.mockResolvedValue(null);

      await expect(service.duplicate("x", "user-1")).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for viewer role", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeSourceDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

      await expect(service.duplicate("diag-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("copies name with (복사본) suffix", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeSourceDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.create.mockImplementation((d: Partial<Diagram>) => d as Diagram);
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.duplicate("diag-1", "user-1");

      const doc = result.content as unknown as DiagramDocument;
      expect(doc.name).toBe("원본 (복사본)");
    });

    it("assigns new IDs to all entities and columns", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeSourceDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.create.mockImplementation((d: Partial<Diagram>) => d as Diagram);
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.duplicate("diag-1", "user-1");

      const doc = result.content as unknown as DiagramDocument;
      expect(doc.entities[0]!.id).not.toBe("ent-1");
      expect(doc.entities[1]!.id).not.toBe("ent-2");
      expect(doc.entities[0]!.columns[0]!.id).not.toBe("col-1");
      expect(doc.entities[1]!.columns[0]!.id).not.toBe("col-2");
    });

    it("remaps relationship entity and column IDs to new IDs", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeSourceDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.create.mockImplementation((d: Partial<Diagram>) => d as Diagram);
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.duplicate("diag-1", "user-1");

      const doc = result.content as unknown as DiagramDocument;
      const newEnt1Id = doc.entities[0]!.id;
      const newEnt2Id = doc.entities[1]!.id;
      const newCol1Id = doc.entities[0]!.columns[0]!.id;
      const newCol2Id = doc.entities[1]!.columns[0]!.id;
      const rel = doc.relationships[0]!;

      expect(rel.id).not.toBe("rel-1");
      expect(rel.sourceEntityId).toBe(newEnt1Id);
      expect(rel.targetEntityId).toBe(newEnt2Id);
      expect(rel.sourceColumnIds).toEqual([newCol1Id]);
      expect(rel.targetColumnIds).toEqual([newCol2Id]);
    });

    it("remaps index entityId and columnIds to new IDs", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeSourceDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.create.mockImplementation((d: Partial<Diagram>) => d as Diagram);
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.duplicate("diag-1", "user-1");

      const doc = result.content as unknown as DiagramDocument;
      const newEnt1Id = doc.entities[0]!.id;
      const newCol1Id = doc.entities[0]!.columns[0]!.id;
      const idx = doc.indexes[0]!;

      expect(idx.id).not.toBe("idx-1");
      expect(idx.entityId).toBe(newEnt1Id);
      expect(idx.columnIds).toEqual([newCol1Id]);
    });

    it("remaps layout entityPositions keys to new entity IDs", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeSourceDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.create.mockImplementation((d: Partial<Diagram>) => d as Diagram);
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.duplicate("diag-1", "user-1");

      const doc = result.content as unknown as DiagramDocument;
      const newEnt1Id = doc.entities[0]!.id;
      const newEnt2Id = doc.entities[1]!.id;
      const positions = doc.layout.entityPositions;

      expect(positions["ent-1"]).toBeUndefined();
      expect(positions["ent-2"]).toBeUndefined();
      expect(positions[newEnt1Id]).toEqual({ x: 10, y: 20 });
      expect(positions[newEnt2Id]).toEqual({ x: 30, y: 40 });
    });

    it("returns diagram with org metadata", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeSourceDoc() as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.create.mockImplementation((d: Partial<Diagram>) => d as Diagram);
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.duplicate("diag-1", "user-1");

      expect(result.organizationId).toBe("org-1");
      expect(result.organizationName).toBe("Test Org");
      expect(result.projectName).toBe("Test Project");
      expect(result.myRole).toBe("editor");
    });
  });

  describe("getActiveUsers", () => {
    const diagramIds = ["diag-1", "diag-2"];

    beforeEach(() => {
      mockCollaborationService.getRoomPresences.mockReturnValue({
        "diag-1": [{ userId: "user-1", email: "kim@example.com", color: "#ef4444" }],
        "diag-2": [],
      });
    });

    it("calls getRoomPresences only with accessible diagram IDs", async () => {
      // diag-1은 접근 가능, diag-2는 접근 불가 (findOne → null)
      diagramRepo.findOne.mockImplementation(({ where: { id } }: { where: { id: string } }) => {
        if (id === "diag-1") return Promise.resolve(makeDiagram({ id: "diag-1" }));
        return Promise.resolve(null);
      });
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });

      await service.getActiveUsers(diagramIds, "user-1");

      expect(mockCollaborationService.getRoomPresences).toHaveBeenCalledWith(["diag-1"]);
    });

    it("returns presence data for accessible diagrams", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ id: "diag-1" }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      orgRepo.findOne.mockResolvedValue({ id: "org-1", name: "Test Org" });
      mockCollaborationService.getRoomPresences.mockReturnValue({
        "diag-1": [{ userId: "user-1", email: "kim@example.com", color: "#ef4444" }],
      });

      const result = await service.getActiveUsers(["diag-1"], "user-1");

      expect(result["diag-1"]).toHaveLength(1);
      expect(result["diag-1"]![0]).toMatchObject({ userId: "user-1", email: "kim@example.com", color: "#ef4444" });
    });

    it("returns empty object when no diagrams are accessible", async () => {
      diagramRepo.findOne.mockResolvedValue(null);
      mockCollaborationService.getRoomPresences.mockReturnValue({});

      const result = await service.getActiveUsers(diagramIds, "user-1");

      expect(result).toEqual({});
      expect(mockCollaborationService.getRoomPresences).toHaveBeenCalledWith([]);
    });
  });
});
